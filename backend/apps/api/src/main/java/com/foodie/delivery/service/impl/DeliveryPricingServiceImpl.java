package com.foodie.delivery.service.impl;

import com.foodie.delivery.dto.request.UpdateDeliveryPricingRequestDto;
import com.foodie.delivery.dto.response.DeliveryPricingConfigResponseDto;
import com.foodie.delivery.entity.DeliveryPricingConfig;
import com.foodie.delivery.repository.DeliveryPricingConfigRepository;
import com.foodie.delivery.service.DeliveryPricingService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeliveryPricingServiceImpl implements DeliveryPricingService {

    private static final UUID DEFAULT_CONFIG_ID = UUID.fromString("99999999-9999-9999-9999-999999999999");
    private final DeliveryPricingConfigRepository configRepository;

    public DeliveryPricingServiceImpl(DeliveryPricingConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryPricingConfigResponseDto getPricingConfig() {
        DeliveryPricingConfig config = getOrCreateConfig();
        return toDto(config);
    }

    @Override
    @Transactional
    public DeliveryPricingConfigResponseDto updatePricingConfig(UUID adminId, UpdateDeliveryPricingRequestDto request) {
        DeliveryPricingConfig config = getOrCreateConfig();
        config.update(
                request.minPricePerDelivery().setScale(2, RoundingMode.HALF_UP),
                request.moneyPerKm().setScale(2, RoundingMode.HALF_UP),
                adminId
        );
        DeliveryPricingConfig saved = configRepository.save(config);
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateDeliveryFee(Double distanceKm) {
        DeliveryPricingConfig config = getOrCreateConfig();
        BigDecimal minPrice = config.getMinPricePerDelivery();
        BigDecimal moneyPerKm = config.getMoneyPerKm();

        double dist = (distanceKm == null || distanceKm < 0) ? 0.0 : distanceKm;
        BigDecimal feeByDistance = moneyPerKm.multiply(BigDecimal.valueOf(dist)).setScale(2, RoundingMode.HALF_UP);

        // Display and payout whichever is greater: max(minPricePerDelivery, distance * moneyPerKm)
        return minPrice.max(feeByDistance).setScale(2, RoundingMode.HALF_UP);
    }

    private DeliveryPricingConfig getOrCreateConfig() {
        return configRepository.findById(DEFAULT_CONFIG_ID)
                .orElseGet(() -> configRepository.save(DeliveryPricingConfig.createDefault()));
    }

    private DeliveryPricingConfigResponseDto toDto(DeliveryPricingConfig config) {
        return new DeliveryPricingConfigResponseDto(
                config.getMinPricePerDelivery(),
                config.getMoneyPerKm(),
                config.getUpdatedAt(),
                config.getUpdatedBy()
        );
    }
}
