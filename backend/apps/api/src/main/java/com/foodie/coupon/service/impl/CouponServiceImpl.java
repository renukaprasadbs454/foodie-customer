package com.foodie.coupon.service.impl;

import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.coupon.dto.request.ApplyCouponRequestDto;
import com.foodie.coupon.dto.request.CreateCouponRequestDto;
import com.foodie.coupon.dto.response.ApplyCouponResponseDto;
import com.foodie.coupon.dto.response.CouponResponseDto;
import com.foodie.coupon.dto.response.DeactivateCouponResponseDto;
import com.foodie.coupon.dto.response.EligibleCouponResponseDto;
import com.foodie.coupon.entity.Coupon;
import com.foodie.coupon.entity.CouponRedemption;
import com.foodie.coupon.entity.DiscountType;
import com.foodie.coupon.mapper.CouponMapper;
import com.foodie.coupon.repository.CouponRedemptionRepository;
import com.foodie.coupon.repository.CouponRepository;
import com.foodie.coupon.service.CouponAdminService;
import com.foodie.coupon.service.CouponEligibilityCache;
import com.foodie.coupon.service.CouponQueryService;
import com.foodie.shared.contract.CouponService;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CouponServiceImpl implements CouponService, CouponQueryService, CouponAdminService {

    private static final Logger log = LoggerFactory.getLogger(CouponServiceImpl.class);

    private final CouponRepository couponRepository;
    private final CouponRedemptionRepository redemptionRepository;
    private final CustomerSummaryProvider customerSummaryProvider;
    private final RestaurantSummaryProvider restaurantSummaryProvider;
    private final CouponEligibilityCache eligibilityCache;

    public CouponServiceImpl(
            CouponRepository couponRepository,
            CouponRedemptionRepository redemptionRepository,
            CustomerSummaryProvider customerSummaryProvider,
            RestaurantSummaryProvider restaurantSummaryProvider,
            CouponEligibilityCache eligibilityCache
    ) {
        this.couponRepository = couponRepository;
        this.redemptionRepository = redemptionRepository;
        this.customerSummaryProvider = customerSummaryProvider;
        this.restaurantSummaryProvider = restaurantSummaryProvider;
        this.eligibilityCache = eligibilityCache;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CouponView> listEligible(UUID customerId, UUID restaurantId, BigDecimal cartTotal) {
        requireRestaurant(restaurantId);
        Instant now = Instant.now();
        BigDecimal total = CouponMapper.scaleMoney(cartTotal);
        List<Coupon> candidates = couponRepository.findEligibleCandidates(restaurantId, total, now);
        List<CouponView> eligible = new ArrayList<>();
        for (Coupon coupon : candidates) {
            if (isWithinUsageLimits(coupon, customerId)) {
                eligibilityCache.markEligible(coupon.getId(), customerId);
                eligible.add(CouponMapper.toView(coupon));
            }
        }
        return eligible;
    }

    @Override
    @Transactional(readOnly = true)
    public DiscountResult apply(String code, UUID customerId, UUID restaurantId, BigDecimal cartTotal) {
        requireRestaurant(restaurantId);
        BigDecimal total = CouponMapper.scaleMoney(cartTotal);
        Coupon coupon = loadActiveByCode(code);
        assertEligible(coupon, customerId, restaurantId, total, Instant.now());
        BigDecimal discount = computeDiscount(coupon, total);
        BigDecimal finalTotal = total.subtract(discount).setScale(2, RoundingMode.HALF_UP);
        eligibilityCache.markEligible(coupon.getId(), customerId);
        return new DiscountResult(coupon.getId(), coupon.getCode(), discount, finalTotal);
    }

    @Override
    @Transactional
    public void recordRedemption(UUID couponId, UUID customerId, UUID orderId) {
        if (redemptionRepository.existsByOrderId(orderId)) {
            log.info("Skipping coupon redemption for order {} — already recorded", orderId);
            return;
        }
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.COUPON_CODE_NOT_FOUND, "Coupon not found."));
        // Order placement already re-validated eligibility; redemption only enforces usage caps
        // so a slow payment cannot strand a legitimately placed discounted order.
        if (!isWithinUsageLimits(coupon, customerId)) {
            throw new UnprocessableEntityException(
                    ErrorCode.COUPON_USAGE_LIMIT_REACHED,
                    "Coupon usage limit has been reached."
            );
        }
        redemptionRepository.save(CouponRedemption.record(couponId, customerId, orderId));
        // Touch version for optimistic concurrency under concurrent redemptions (Phase3 §19.9).
        couponRepository.save(coupon);
        eligibilityCache.invalidate(couponId, customerId);
        log.info("Recorded coupon {} redemption for customer {} on order {}", couponId, customerId, orderId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EligibleCouponResponseDto> listEligibleForCaller(
            UUID userCredentialId, UUID restaurantId, BigDecimal cartTotal) {
        UUID customerId = resolveCustomerId(userCredentialId);
        return listEligible(customerId, restaurantId, cartTotal).stream()
                .map(CouponMapper::toEligibleDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ApplyCouponResponseDto applyForCaller(UUID userCredentialId, ApplyCouponRequestDto request) {
        UUID customerId = resolveCustomerId(userCredentialId);
        return CouponMapper.toApplyDto(apply(
                request.code(), customerId, request.restaurantId(), request.cartTotal()));
    }

    @Override
    @Transactional
    public CouponResponseDto create(CreateCouponRequestDto request) {
        validateCreateRules(request);
        if (request.getRestaurantId() != null) {
            requireRestaurant(request.getRestaurantId());
        }
        String code = request.getCode().trim().toUpperCase(Locale.ROOT);
        if (couponRepository.existsByCode(code)) {
            throw new ConflictException(
                    ErrorCode.COUPON_CODE_ALREADY_EXISTS,
                    "Coupon code already exists."
            );
        }
        Instant expiry = endOfDayUtc(request.getExpiryDate());
        Coupon coupon = Coupon.create(
                code,
                request.getDiscountType(),
                CouponMapper.scaleMoney(request.getValue()),
                CouponMapper.scaleMoney(request.getMinOrderAmount()),
                request.getMaxDiscountAmount() == null
                        ? null
                        : CouponMapper.scaleMoney(request.getMaxDiscountAmount()),
                expiry,
                request.getUsageLimitTotal(),
                request.getUsageLimitPerUser(),
                request.getRestaurantId()
        );
        try {
            coupon = couponRepository.save(coupon);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(
                    ErrorCode.COUPON_CODE_ALREADY_EXISTS,
                    "Coupon code already exists."
            );
        }
        return CouponMapper.toResponse(coupon);
    }

    @Override
    @Transactional
    public DeactivateCouponResponseDto deactivate(UUID couponId) {
        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found."));
        coupon.deactivate();
        couponRepository.save(coupon);
        return new DeactivateCouponResponseDto(coupon.getId(), coupon.isActive());
    }

    private void assertEligible(
            Coupon coupon,
            UUID customerId,
            UUID restaurantId,
            BigDecimal cartTotal,
            Instant now
    ) {
        if (!coupon.isActive()) {
            throw new UnprocessableEntityException(
                    ErrorCode.COUPON_INVALID, "Coupon is not active.");
        }
        if (coupon.isExpired(now)) {
            throw new UnprocessableEntityException(
                    ErrorCode.COUPON_EXPIRED, "Coupon has expired.");
        }
        if (restaurantId != null
                && coupon.getRestaurantId() != null
                && !coupon.getRestaurantId().equals(restaurantId)) {
            throw new UnprocessableEntityException(
                    ErrorCode.COUPON_NOT_APPLICABLE_TO_RESTAURANT,
                    "Coupon is not applicable to this restaurant."
            );
        }
        if (cartTotal != null && cartTotal.compareTo(coupon.getMinOrderAmount()) < 0) {
            throw new UnprocessableEntityException(
                    ErrorCode.COUPON_MIN_ORDER_NOT_MET,
                    "Cart total does not meet the coupon minimum order amount."
            );
        }
        if (!isWithinUsageLimits(coupon, customerId)) {
            throw new UnprocessableEntityException(
                    ErrorCode.COUPON_USAGE_LIMIT_REACHED,
                    "Coupon usage limit has been reached."
            );
        }
    }

    private boolean isWithinUsageLimits(Coupon coupon, UUID customerId) {
        // Eligibility cache is write-through hint only; usage counts always come from PostgreSQL.
        long perUser = redemptionRepository.countByCouponIdAndCustomerId(coupon.getId(), customerId);
        if (perUser >= coupon.getUsageLimitPerUser()) {
            return false;
        }
        if (coupon.getUsageLimitTotal() != null) {
            long total = redemptionRepository.countByCouponId(coupon.getId());
            if (total >= coupon.getUsageLimitTotal()) {
                return false;
            }
        }
        return true;
    }

    private Coupon loadActiveByCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ResourceNotFoundException(
                    ErrorCode.COUPON_CODE_NOT_FOUND, "Coupon code not found.");
        }
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        return couponRepository.findByCode(normalized)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.COUPON_CODE_NOT_FOUND, "Coupon code not found."));
    }

    public static BigDecimal computeDiscount(Coupon coupon, BigDecimal cartTotal) {
        BigDecimal discount;
        if (coupon.getDiscountType() == DiscountType.FLAT) {
            discount = coupon.getValue();
        } else {
            discount = cartTotal
                    .multiply(coupon.getValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (coupon.getMaxDiscountAmount() != null) {
                discount = discount.min(coupon.getMaxDiscountAmount());
            }
        }
        return discount.min(cartTotal).setScale(2, RoundingMode.HALF_UP);
    }

    private void validateCreateRules(CreateCouponRequestDto request) {
        if (request.getDiscountType() == DiscountType.PERCENT) {
            if (request.getValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new UnprocessableEntityException(
                        ErrorCode.INVALID_PERCENT_VALUE,
                        "Percent discount value must be <= 100."
                );
            }
            if (request.getMaxDiscountAmount() == null
                    || request.getMaxDiscountAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new UnprocessableEntityException(
                        ErrorCode.MAX_DISCOUNT_REQUIRED_FOR_PERCENT,
                        "maxDiscountAmount is required and must be > 0 for PERCENT coupons."
                );
            }
        }
        if (request.getUsageLimitTotal() != null && request.getUsageLimitTotal() <= 0) {
            throw new UnprocessableEntityException(
                    ErrorCode.VALIDATION_FAILED,
                    "usageLimitTotal must be > 0 when provided."
            );
        }
    }

    private static Instant endOfDayUtc(LocalDate date) {
        return date.atTime(23, 59, 59).toInstant(ZoneOffset.UTC);
    }

    private UUID resolveCustomerId(UUID userCredentialId) {
        return customerSummaryProvider.findByUserCredentialId(userCredentialId)
                .map(CustomerSummaryProvider.CustomerSummary::customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));
    }

    private void requireRestaurant(UUID restaurantId) {
        restaurantSummaryProvider.findByRestaurantId(restaurantId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant not found."));
    }
}
