package com.foodie.admin;

import com.foodie.admin.dto.request.CommissionConfigDto;
import com.foodie.admin.dto.response.PaymentSplitBreakdownDto;
import com.foodie.admin.service.impl.AdminPaymentServiceImpl;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AdminPaymentServiceImplTest {

    private AdminPaymentServiceImpl paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new AdminPaymentServiceImpl();
    }

    @Test
    @DisplayName("Default commission rules match 15% rest, 10% delivery, and 40 fixed fee")
    void defaultCommissionRules() {
        CommissionConfigDto rules = paymentService.getCommissionRules();
        assertThat(rules.restaurantCommissionRate()).isEqualByComparingTo("15.00");
        assertThat(rules.deliveryCommissionRate()).isEqualByComparingTo("10.00");
        assertThat(rules.platformFixedFee()).isEqualByComparingTo("40.00");
    }

    @Test
    @DisplayName("Calculate payment split conserves 100% of customer paid bill")
    void calculateSplitConservesMoney() {
        BigDecimal foodSubtotal = new BigDecimal("450.00");
        BigDecimal deliveryFee = new BigDecimal("90.00");

        PaymentSplitBreakdownDto split = paymentService.calculateSplit(foodSubtotal, deliveryFee);

        assertThat(split.totalPaid()).isEqualByComparingTo("580.00");
        assertThat(split.adminFoodCommission()).isEqualByComparingTo("67.50");
        assertThat(split.adminDeliveryCommission()).isEqualByComparingTo("9.00");
        assertThat(split.platformFee()).isEqualByComparingTo("40.00");
        assertThat(split.adminTotalRevenue()).isEqualByComparingTo("116.50");
        assertThat(split.restaurantNetShare()).isEqualByComparingTo("382.50");
        assertThat(split.deliveryPartnerNetShare()).isEqualByComparingTo("81.00");

        BigDecimal sumDistributed = split.adminTotalRevenue()
                .add(split.restaurantNetShare())
                .add(split.deliveryPartnerNetShare());

        assertThat(sumDistributed).isEqualByComparingTo(split.totalPaid());
    }

    @Test
    @DisplayName("Updating commission rules dynamically adjusts split calculations")
    void updateCommissionRules() {
        CommissionConfigDto newRules = new CommissionConfigDto(
                new BigDecimal("20.00"),
                new BigDecimal("5.00"),
                new BigDecimal("50.00")
        );

        paymentService.updateCommissionRules(newRules);

        PaymentSplitBreakdownDto split = paymentService.calculateSplit(
                new BigDecimal("500.00"),
                new BigDecimal("100.00")
        );

        assertThat(split.adminFoodCommission()).isEqualByComparingTo("100.00"); // 20% of 500
        assertThat(split.adminDeliveryCommission()).isEqualByComparingTo("5.00"); // 5% of 100
        assertThat(split.platformFee()).isEqualByComparingTo("50.00");
        assertThat(split.adminTotalRevenue()).isEqualByComparingTo("155.00");
        assertThat(split.restaurantNetShare()).isEqualByComparingTo("400.00");
        assertThat(split.deliveryPartnerNetShare()).isEqualByComparingTo("95.00");
        assertThat(split.totalPaid()).isEqualByComparingTo("650.00");
    }
}
