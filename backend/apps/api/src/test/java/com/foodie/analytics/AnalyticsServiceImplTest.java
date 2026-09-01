package com.foodie.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.analytics.dto.request.DateRangeParams;
import com.foodie.analytics.dto.response.DailySalesPointDto;
import com.foodie.analytics.dto.response.DashboardSummaryResponseDto;
import com.foodie.analytics.dto.response.OrderStatusMetricDto;
import com.foodie.analytics.service.impl.AnalyticsServiceImpl;
import com.foodie.common.exception.BadRequestException;
import com.foodie.shared.contract.CustomerAnalyticsQuery;
import com.foodie.shared.contract.DeliveryAnalyticsQuery;
import com.foodie.shared.contract.OrderAnalyticsQuery;
import com.foodie.shared.contract.PaymentAnalyticsQuery;
import com.foodie.shared.contract.RestaurantAnalyticsQuery;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceImplTest {

    @Mock private OrderAnalyticsQuery orderAnalyticsQuery;
    @Mock private PaymentAnalyticsQuery paymentAnalyticsQuery;
    @Mock private RestaurantAnalyticsQuery restaurantAnalyticsQuery;
    @Mock private DeliveryAnalyticsQuery deliveryAnalyticsQuery;
    @Mock private CustomerAnalyticsQuery customerAnalyticsQuery;

    private AnalyticsServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AnalyticsServiceImpl(
                orderAnalyticsQuery,
                paymentAnalyticsQuery,
                restaurantAnalyticsQuery,
                deliveryAnalyticsQuery,
                customerAnalyticsQuery
        );
    }

    @Test
    void dashboardSummary_aggregatesProjectionResults() {
        DateRangeParams range = new DateRangeParams(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 7));
        when(orderAnalyticsQuery.countPlacedBetween(any(), any())).thenReturn(10L);
        when(paymentAnalyticsQuery.sumCapturedBetween(any(), any())).thenReturn(new BigDecimal("1000.00"));
        when(restaurantAnalyticsQuery.countApproved()).thenReturn(97L);
        when(deliveryAnalyticsQuery.countKycVerified()).thenReturn(412L);
        when(customerAnalyticsQuery.countCreatedBetween(any(), any())).thenReturn(5L);

        DashboardSummaryResponseDto dto = service.getDashboardSummary(range);

        assertThat(dto.totalOrders()).isEqualTo(10);
        assertThat(dto.totalRevenue()).isEqualByComparingTo("1000.00");
        assertThat(dto.activeRestaurants()).isEqualTo(97);
        assertThat(dto.activeDeliveryPartners()).isEqualTo(412);
        assertThat(dto.newCustomers()).isEqualTo(5);
        assertThat(dto.avgOrderValue()).isEqualByComparingTo("100.00");
    }

    @Test
    void dashboardSummary_zeroOrders_avgIsZero() {
        DateRangeParams range = new DateRangeParams(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 1));
        when(orderAnalyticsQuery.countPlacedBetween(any(), any())).thenReturn(0L);
        when(paymentAnalyticsQuery.sumCapturedBetween(any(), any())).thenReturn(BigDecimal.ZERO);
        when(restaurantAnalyticsQuery.countApproved()).thenReturn(0L);
        when(deliveryAnalyticsQuery.countKycVerified()).thenReturn(0L);
        when(customerAnalyticsQuery.countCreatedBetween(any(), any())).thenReturn(0L);

        assertThat(service.getDashboardSummary(range).avgOrderValue()).isEqualByComparingTo("0.00");
    }

    @Test
    void dailySales_mapsRows() {
        DateRangeParams range = new DateRangeParams(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2));
        when(orderAnalyticsQuery.dailySalesByPlacedAt(any(), any())).thenReturn(List.of(
                new OrderAnalyticsQuery.DailySalesRow(
                        LocalDate.of(2026, 8, 1), 3L, new BigDecimal("150.00"))
        ));

        List<DailySalesPointDto> points = service.getDailySales(range);

        assertThat(points).hasSize(1);
        assertThat(points.getFirst().orderCount()).isEqualTo(3);
        assertThat(points.getFirst().revenue()).isEqualByComparingTo("150.00");
    }

    @Test
    void orderStatusMetrics_computesPercentages() {
        DateRangeParams range = new DateRangeParams(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));
        when(orderAnalyticsQuery.countByStatusPlacedBetween(any(), any())).thenReturn(List.of(
                new OrderAnalyticsQuery.StatusCountRow("DELIVERED", 75),
                new OrderAnalyticsQuery.StatusCountRow("CANCELLED", 25)
        ));

        List<OrderStatusMetricDto> metrics = service.getOrderStatusMetrics(range);

        assertThat(metrics).hasSize(2);
        assertThat(metrics.getFirst().status()).isEqualTo("CANCELLED");
        assertThat(metrics.getFirst().percentageOfTotal()).isEqualByComparingTo("25.00");
        assertThat(metrics.get(1).percentageOfTotal()).isEqualByComparingTo("75.00");
    }

    @Test
    void invalidRange_throws400() {
        assertThatThrownBy(() -> service.getDashboardSummary(
                new DateRangeParams(LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 1))))
                .isInstanceOf(BadRequestException.class);
        verify(orderAnalyticsQuery, org.mockito.Mockito.never()).countPlacedBetween(any(), any());
    }
}
