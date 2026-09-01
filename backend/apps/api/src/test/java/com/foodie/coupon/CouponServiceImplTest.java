package com.foodie.coupon;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.common.exception.ConflictException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.coupon.dto.request.CreateCouponRequestDto;
import com.foodie.coupon.entity.Coupon;
import com.foodie.coupon.entity.CouponRedemption;
import com.foodie.coupon.entity.DiscountType;
import com.foodie.coupon.repository.CouponRedemptionRepository;
import com.foodie.coupon.repository.CouponRepository;
import com.foodie.coupon.service.CouponEligibilityCache;
import com.foodie.coupon.service.impl.CouponServiceImpl;
import com.foodie.shared.contract.CouponService;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class CouponServiceImplTest {

    @Mock private CouponRepository couponRepository;
    @Mock private CouponRedemptionRepository redemptionRepository;
    @Mock private CustomerSummaryProvider customerSummaryProvider;
    @Mock private RestaurantSummaryProvider restaurantSummaryProvider;
    @Mock private CouponEligibilityCache eligibilityCache;

    private CouponServiceImpl service;

    private final UUID customerId = UUID.randomUUID();
    private final UUID restaurantId = UUID.randomUUID();
    private final UUID credentialId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new CouponServiceImpl(
                couponRepository,
                redemptionRepository,
                customerSummaryProvider,
                restaurantSummaryProvider,
                eligibilityCache
        );
    }

    @Test
    void apply_flatDiscount_returnsDiscountAndFinalTotal() {
        stubRestaurant();
        Coupon coupon = activeFlat("WELCOME50", "50.00", "200.00", null);
        when(couponRepository.findByCode("WELCOME50")).thenReturn(Optional.of(coupon));
        when(redemptionRepository.countByCouponIdAndCustomerId(coupon.getId(), customerId)).thenReturn(0L);

        CouponService.DiscountResult result = service.apply(
                "welcome50", customerId, restaurantId, new BigDecimal("440.00"));

        assertThat(result.code()).isEqualTo("WELCOME50");
        assertThat(result.discountAmount()).isEqualByComparingTo("50.00");
        assertThat(result.finalTotal()).isEqualByComparingTo("390.00");
        assertThat(result.couponId()).isEqualTo(coupon.getId());
        verify(eligibilityCache).markEligible(coupon.getId(), customerId);
        verify(redemptionRepository, never()).save(any());
    }

    @Test
    void apply_percentCappedByMaxDiscount() {
        stubRestaurant();
        Coupon coupon = activePercent("SAVE20", "20.00", "0.00", "30.00");
        when(couponRepository.findByCode("SAVE20")).thenReturn(Optional.of(coupon));
        when(redemptionRepository.countByCouponIdAndCustomerId(coupon.getId(), customerId)).thenReturn(0L);

        CouponService.DiscountResult result = service.apply(
                "SAVE20", customerId, restaurantId, new BigDecimal("400.00"));

        // 20% of 400 = 80, capped at 30
        assertThat(result.discountAmount()).isEqualByComparingTo("30.00");
        assertThat(result.finalTotal()).isEqualByComparingTo("370.00");
    }

    @Test
    void apply_expired_throws422() {
        stubRestaurant();
        Coupon coupon = activeFlat("OLD", "10.00", "0.00", null);
        ReflectionTestUtils.setField(coupon, "expiryDate", Instant.parse("2020-01-01T00:00:00Z"));
        when(couponRepository.findByCode("OLD")).thenReturn(Optional.of(coupon));

        assertThatThrownBy(() -> service.apply("OLD", customerId, restaurantId, new BigDecimal("100.00")))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.COUPON_EXPIRED);
    }

    @Test
    void apply_minOrderNotMet_throws422() {
        stubRestaurant();
        Coupon coupon = activeFlat("BIG", "50.00", "500.00", null);
        when(couponRepository.findByCode("BIG")).thenReturn(Optional.of(coupon));

        assertThatThrownBy(() -> service.apply("BIG", customerId, restaurantId, new BigDecimal("100.00")))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.COUPON_MIN_ORDER_NOT_MET);
    }

    @Test
    void apply_wrongRestaurant_throws422() {
        stubRestaurant();
        Coupon coupon = activeFlat("RONLY", "10.00", "0.00", UUID.randomUUID());
        when(couponRepository.findByCode("RONLY")).thenReturn(Optional.of(coupon));

        assertThatThrownBy(() -> service.apply("RONLY", customerId, restaurantId, new BigDecimal("100.00")))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.COUPON_NOT_APPLICABLE_TO_RESTAURANT);
    }

    @Test
    void apply_usageLimitReached_throws422() {
        stubRestaurant();
        Coupon coupon = activeFlat("ONCE", "10.00", "0.00", null);
        when(couponRepository.findByCode("ONCE")).thenReturn(Optional.of(coupon));
        when(redemptionRepository.countByCouponIdAndCustomerId(coupon.getId(), customerId)).thenReturn(1L);

        assertThatThrownBy(() -> service.apply("ONCE", customerId, restaurantId, new BigDecimal("100.00")))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.COUPON_USAGE_LIMIT_REACHED);
    }

    @Test
    void apply_unknownCode_throws404() {
        stubRestaurant();
        when(couponRepository.findByCode("NOPE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.apply("NOPE", customerId, restaurantId, new BigDecimal("100.00")))
                .isInstanceOf(ResourceNotFoundException.class)
                .extracting(ex -> ((ResourceNotFoundException) ex).getErrorCode())
                .isEqualTo(ErrorCode.COUPON_CODE_NOT_FOUND);
    }

    @Test
    void listEligible_filtersByPerUserUsage() {
        stubRestaurant();
        Coupon ok = activeFlat("OK", "10.00", "0.00", null);
        Coupon used = activeFlat("USED", "10.00", "0.00", null);
        when(couponRepository.findEligibleCandidates(any(), any(), any())).thenReturn(List.of(ok, used));
        when(redemptionRepository.countByCouponIdAndCustomerId(ok.getId(), customerId)).thenReturn(0L);
        when(redemptionRepository.countByCouponIdAndCustomerId(used.getId(), customerId)).thenReturn(1L);

        List<CouponService.CouponView> views = service.listEligible(
                customerId, restaurantId, new BigDecimal("100.00"));

        assertThat(views).extracting(CouponService.CouponView::code).containsExactly("OK");
    }

    @Test
    void recordRedemption_insertsAndInvalidatesCache() {
        Coupon coupon = activeFlat("WELCOME50", "50.00", "0.00", null);
        UUID orderId = UUID.randomUUID();
        when(redemptionRepository.existsByOrderId(orderId)).thenReturn(false);
        when(couponRepository.findById(coupon.getId())).thenReturn(Optional.of(coupon));
        when(redemptionRepository.countByCouponIdAndCustomerId(coupon.getId(), customerId)).thenReturn(0L);
        when(redemptionRepository.save(any(CouponRedemption.class))).thenAnswer(inv -> inv.getArgument(0));
        when(couponRepository.save(coupon)).thenReturn(coupon);

        service.recordRedemption(coupon.getId(), customerId, orderId);

        ArgumentCaptor<CouponRedemption> captor = ArgumentCaptor.forClass(CouponRedemption.class);
        verify(redemptionRepository).save(captor.capture());
        assertThat(captor.getValue().getOrderId()).isEqualTo(orderId);
        verify(eligibilityCache).invalidate(coupon.getId(), customerId);
    }

    @Test
    void recordRedemption_idempotentWhenOrderAlreadyRedeemed() {
        UUID orderId = UUID.randomUUID();
        when(redemptionRepository.existsByOrderId(orderId)).thenReturn(true);

        service.recordRedemption(UUID.randomUUID(), customerId, orderId);

        verify(redemptionRepository, never()).save(any());
    }

    @Test
    void create_percentWithoutMaxDiscount_throws422() {
        CreateCouponRequestDto request = new CreateCouponRequestDto(
                "PCT10",
                DiscountType.PERCENT,
                new BigDecimal("10.00"),
                new BigDecimal("0.00"),
                null,
                LocalDate.now().plusDays(30),
                100,
                1,
                null
        );

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.MAX_DISCOUNT_REQUIRED_FOR_PERCENT);
    }

    @Test
    void create_duplicateCode_throws409() {
        when(couponRepository.existsByCode("DUP")).thenReturn(true);
        CreateCouponRequestDto request = new CreateCouponRequestDto(
                "DUP",
                DiscountType.FLAT,
                new BigDecimal("10.00"),
                new BigDecimal("0.00"),
                null,
                LocalDate.now().plusDays(30),
                null,
                1,
                null
        );

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ConflictException.class)
                .extracting(ex -> ((ConflictException) ex).getErrorCode())
                .isEqualTo(ErrorCode.COUPON_CODE_ALREADY_EXISTS);
    }

    @Test
    void create_flat_persistsNormalizedCode() {
        when(couponRepository.existsByCode("FLAT10")).thenReturn(false);
        when(couponRepository.save(any(Coupon.class))).thenAnswer(inv -> {
            Coupon c = inv.getArgument(0);
            ReflectionTestUtils.setField(c, "id", UUID.randomUUID());
            return c;
        });
        CreateCouponRequestDto request = new CreateCouponRequestDto(
                "FLAT10",
                DiscountType.FLAT,
                new BigDecimal("10.00"),
                new BigDecimal("50.00"),
                null,
                LocalDate.now().plusDays(10),
                500,
                1,
                null
        );

        var response = service.create(request);

        assertThat(response.code()).isEqualTo("FLAT10");
        assertThat(response.isActive()).isTrue();
        assertThat(response.expiryDate()).isEqualTo(
                LocalDate.now().plusDays(10).atTime(23, 59, 59).toInstant(java.time.ZoneOffset.UTC));
    }

    @Test
    void listEligibleForCaller_resolvesCustomer() {
        stubRestaurant();
        when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.of(
                new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
        when(couponRepository.findEligibleCandidates(any(), any(), any())).thenReturn(List.of());

        assertThat(service.listEligibleForCaller(credentialId, restaurantId, new BigDecimal("10.00")))
                .isEmpty();
    }

    private void stubRestaurant() {
        when(restaurantSummaryProvider.findByRestaurantId(restaurantId)).thenReturn(Optional.of(
                new RestaurantSummaryProvider.RestaurantSummary(
                        restaurantId, "R", "APPROVED", null)));
    }

    private Coupon activeFlat(String code, String value, String minOrder, UUID restaurant) {
        Coupon coupon = Coupon.create(
                code,
                DiscountType.FLAT,
                new BigDecimal(value),
                new BigDecimal(minOrder),
                null,
                Instant.now().plusSeconds(86_400),
                null,
                1,
                restaurant
        );
        ReflectionTestUtils.setField(coupon, "id", UUID.randomUUID());
        return coupon;
    }

    private Coupon activePercent(String code, String value, String minOrder, String maxDiscount) {
        Coupon coupon = Coupon.create(
                code,
                DiscountType.PERCENT,
                new BigDecimal(value),
                new BigDecimal(minOrder),
                new BigDecimal(maxDiscount),
                Instant.now().plusSeconds(86_400),
                null,
                1,
                null
        );
        ReflectionTestUtils.setField(coupon, "id", UUID.randomUUID());
        return coupon;
    }
}
