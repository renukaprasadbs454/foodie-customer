package com.foodie.delivery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.delivery.dto.request.UpdateDeliveryPricingRequestDto;
import com.foodie.delivery.dto.response.DeliveryPricingConfigResponseDto;
import com.foodie.delivery.entity.DeliveryPricingConfig;
import com.foodie.delivery.repository.DeliveryPricingConfigRepository;
import com.foodie.delivery.service.impl.DeliveryPricingServiceImpl;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DeliveryPricingServiceImplTest {

    @Mock
    private DeliveryPricingConfigRepository configRepository;

    private DeliveryPricingServiceImpl pricingService;
    private DeliveryPricingConfig defaultConfig;

    @BeforeEach
    void setUp() {
        pricingService = new DeliveryPricingServiceImpl(configRepository);
        defaultConfig = DeliveryPricingConfig.createDefault();
    }

    @Test
    void calculateDeliveryFee_returnsMinPrice_whenDistanceRateIsSmaller() {
        when(configRepository.findById(any())).thenReturn(Optional.of(defaultConfig));

        // 2 km @ 25/km = 50 < min price 200 -> should return 200.00
        BigDecimal fee = pricingService.calculateDeliveryFee(2.0);

        assertThat(fee).isEqualByComparingTo("200.00");
    }

    @Test
    void calculateDeliveryFee_returnsPerKmPrice_whenDistanceRateIsGreater() {
        when(configRepository.findById(any())).thenReturn(Optional.of(defaultConfig));

        // 10 km @ 25/km = 250 > min price 200 -> should return 250.00
        BigDecimal fee = pricingService.calculateDeliveryFee(10.0);

        assertThat(fee).isEqualByComparingTo("250.00");
    }

    @Test
    void updatePricingConfig_updatesAndReturnsNewConfig() {
        when(configRepository.findById(any())).thenReturn(Optional.of(defaultConfig));
        when(configRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        UUID adminId = UUID.randomUUID();
        UpdateDeliveryPricingRequestDto request = new UpdateDeliveryPricingRequestDto(
                new BigDecimal("40.00"),
                new BigDecimal("12.50")
        );

        DeliveryPricingConfigResponseDto updated = pricingService.updatePricingConfig(adminId, request);

        assertThat(updated.minPricePerDelivery()).isEqualByComparingTo("40.00");
        assertThat(updated.moneyPerKm()).isEqualByComparingTo("12.50");
        assertThat(updated.updatedBy()).isEqualTo(adminId);
    }
}
