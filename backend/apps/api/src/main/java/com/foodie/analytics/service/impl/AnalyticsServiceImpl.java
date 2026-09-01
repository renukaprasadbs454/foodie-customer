package com.foodie.analytics.service.impl;

import com.foodie.analytics.dto.request.DateRangeParams;
import com.foodie.analytics.dto.response.DailySalesPointDto;
import com.foodie.analytics.dto.response.DashboardSummaryResponseDto;
import com.foodie.analytics.dto.response.OrderStatusMetricDto;
import com.foodie.analytics.service.AnalyticsService;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.shared.contract.CustomerAnalyticsQuery;
import com.foodie.shared.contract.DeliveryAnalyticsQuery;
import com.foodie.shared.contract.OrderAnalyticsQuery;
import com.foodie.shared.contract.PaymentAnalyticsQuery;
import com.foodie.shared.contract.RestaurantAnalyticsQuery;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsServiceImpl implements AnalyticsService {

    private final OrderAnalyticsQuery orderAnalyticsQuery;
    private final PaymentAnalyticsQuery paymentAnalyticsQuery;
    private final RestaurantAnalyticsQuery restaurantAnalyticsQuery;
    private final DeliveryAnalyticsQuery deliveryAnalyticsQuery;
    private final CustomerAnalyticsQuery customerAnalyticsQuery;

    public AnalyticsServiceImpl(
            OrderAnalyticsQuery orderAnalyticsQuery,
            PaymentAnalyticsQuery paymentAnalyticsQuery,
            RestaurantAnalyticsQuery restaurantAnalyticsQuery,
            DeliveryAnalyticsQuery deliveryAnalyticsQuery,
            CustomerAnalyticsQuery customerAnalyticsQuery
    ) {
        this.orderAnalyticsQuery = orderAnalyticsQuery;
        this.paymentAnalyticsQuery = paymentAnalyticsQuery;
        this.restaurantAnalyticsQuery = restaurantAnalyticsQuery;
        this.deliveryAnalyticsQuery = deliveryAnalyticsQuery;
        this.customerAnalyticsQuery = customerAnalyticsQuery;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponseDto getDashboardSummary(DateRangeParams range) {
        validate(range);
        var from = range.fromInclusive();
        var to = range.toExclusive();

        long totalOrders = orderAnalyticsQuery.countPlacedBetween(from, to);
        BigDecimal totalRevenue = paymentAnalyticsQuery.sumCapturedBetween(from, to);
        long activeRestaurants = restaurantAnalyticsQuery.countApproved();
        long activeDeliveryPartners = deliveryAnalyticsQuery.countKycVerified();
        long newCustomers = customerAnalyticsQuery.countCreatedBetween(from, to);
        BigDecimal avgOrderValue = totalOrders == 0
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : totalRevenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP);

        return new DashboardSummaryResponseDto(
                totalOrders,
                totalRevenue,
                activeRestaurants,
                activeDeliveryPartners,
                newCustomers,
                avgOrderValue
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<DailySalesPointDto> getDailySales(DateRangeParams range) {
        validate(range);
        return orderAnalyticsQuery.dailySalesByPlacedAt(range.fromInclusive(), range.toExclusive())
                .stream()
                .map(row -> new DailySalesPointDto(row.date(), row.orderCount(), row.revenue()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderStatusMetricDto> getOrderStatusMetrics(DateRangeParams range) {
        validate(range);
        List<OrderAnalyticsQuery.StatusCountRow> rows =
                orderAnalyticsQuery.countByStatusPlacedBetween(range.fromInclusive(), range.toExclusive());
        long total = rows.stream().mapToLong(OrderAnalyticsQuery.StatusCountRow::count).sum();
        List<OrderStatusMetricDto> metrics = new ArrayList<>();
        for (OrderAnalyticsQuery.StatusCountRow row : rows) {
            BigDecimal pct = total == 0
                    ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.valueOf(row.count())
                            .multiply(BigDecimal.valueOf(100))
                            .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
            metrics.add(new OrderStatusMetricDto(row.status(), row.count(), pct));
        }
        metrics.sort(Comparator.comparing(OrderStatusMetricDto::status));
        return metrics;
    }

    private static void validate(DateRangeParams range) {
        if (range == null || range.dateFrom() == null || range.dateTo() == null) {
            throw new BadRequestException(
                    ErrorCode.VALIDATION_FAILED, "dateFrom and dateTo are required ISO dates.");
        }
        if (range.dateFrom().isAfter(range.dateTo())) {
            throw new BadRequestException(
                    ErrorCode.VALIDATION_FAILED, "dateFrom must be on or before dateTo.");
        }
    }
}
