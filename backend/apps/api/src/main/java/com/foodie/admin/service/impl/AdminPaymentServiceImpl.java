package com.foodie.admin.service.impl;

import com.foodie.admin.dto.request.CommissionConfigDto;
import com.foodie.admin.dto.response.PaymentSettlementResponseDto;
import com.foodie.admin.dto.response.PaymentSplitBreakdownDto;
import com.foodie.admin.service.AdminPaymentService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Service;

@Service
public class AdminPaymentServiceImpl implements AdminPaymentService {

    private final AtomicReference<CommissionConfigDto> activeConfig = new AtomicReference<>(
            new CommissionConfigDto(
                    new BigDecimal("15.00"),
                    new BigDecimal("10.00"),
                    new BigDecimal("40.00")
            )
    );

    @Override
    public CommissionConfigDto getCommissionRules() {
        return activeConfig.get();
    }

    @Override
    public CommissionConfigDto updateCommissionRules(CommissionConfigDto config) {
        CommissionConfigDto updated = new CommissionConfigDto(
                config.restaurantCommissionRate().setScale(2, RoundingMode.HALF_UP),
                config.deliveryCommissionRate().setScale(2, RoundingMode.HALF_UP),
                config.platformFixedFee().setScale(2, RoundingMode.HALF_UP)
        );
        activeConfig.set(updated);
        return updated;
    }

    @Override
    public PaymentSplitBreakdownDto calculateSplit(BigDecimal foodSubtotal, BigDecimal deliveryFee) {
        CommissionConfigDto rules = activeConfig.get();

        BigDecimal food = foodSubtotal != null ? foodSubtotal : BigDecimal.ZERO;
        BigDecimal delivery = deliveryFee != null ? deliveryFee : BigDecimal.ZERO;
        BigDecimal fee = rules.platformFixedFee();

        BigDecimal hundred = new BigDecimal("100.00");
        BigDecimal adminFoodComm = food.multiply(rules.restaurantCommissionRate())
                .divide(hundred, 2, RoundingMode.HALF_UP);

        BigDecimal adminDelivComm = delivery.multiply(rules.deliveryCommissionRate())
                .divide(hundred, 2, RoundingMode.HALF_UP);

        BigDecimal adminTotalRev = adminFoodComm.add(adminDelivComm).add(fee).setScale(2, RoundingMode.HALF_UP);
        BigDecimal restaurantShare = food.subtract(adminFoodComm).setScale(2, RoundingMode.HALF_UP);
        BigDecimal deliveryShare = delivery.subtract(adminDelivComm).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPaid = food.add(delivery).add(fee).setScale(2, RoundingMode.HALF_UP);

        return new PaymentSplitBreakdownDto(
                totalPaid,
                food.setScale(2, RoundingMode.HALF_UP),
                delivery.setScale(2, RoundingMode.HALF_UP),
                fee.setScale(2, RoundingMode.HALF_UP),
                adminFoodComm,
                adminDelivComm,
                adminTotalRev,
                restaurantShare,
                deliveryShare
        );
    }

    @Override
    public List<PaymentSettlementResponseDto> listSettlements() {
        List<PaymentSettlementResponseDto> mockList = new ArrayList<>();
        Instant now = Instant.now();

        mockList.add(new PaymentSettlementResponseDto(
                UUID.fromString("00000000-0000-0000-0000-000000000901"),
                UUID.randomUUID(),
                "ORD-8801",
                "Sarah Jenkins",
                "RAZORPAY_UPI",
                new BigDecimal("580.00"),
                new BigDecimal("450.00"),
                new BigDecimal("90.00"),
                new BigDecimal("116.50"),
                new BigDecimal("382.50"),
                "Royal Biryani House",
                new BigDecimal("81.00"),
                "Rahul Sharma (Rider)",
                "FUNDS_DISTRIBUTED",
                now.minusSeconds(1800)
        ));

        mockList.add(new PaymentSettlementResponseDto(
                UUID.fromString("00000000-0000-0000-0000-000000000902"),
                UUID.randomUUID(),
                "ORD-8802",
                "Marcus Vance",
                "CREDIT_CARD",
                new BigDecimal("440.00"),
                new BigDecimal("350.00"),
                new BigDecimal("50.00"),
                new BigDecimal("97.50"),
                new BigDecimal("297.50"),
                "Bella Italia Pizzeria",
                new BigDecimal("45.00"),
                "Vikram Singh (Rider)",
                "FUNDS_DISTRIBUTED",
                now.minusSeconds(3600)
        ));

        return mockList;
    }
}
