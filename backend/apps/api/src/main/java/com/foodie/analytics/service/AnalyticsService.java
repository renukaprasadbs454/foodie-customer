package com.foodie.analytics.service;

import com.foodie.analytics.dto.request.DateRangeParams;
import com.foodie.analytics.dto.response.DailySalesPointDto;
import com.foodie.analytics.dto.response.DashboardSummaryResponseDto;
import com.foodie.analytics.dto.response.OrderStatusMetricDto;
import java.util.List;

/**
 * Analytics public interface (Phase3 §2.14) — read-only reporting.
 */
public interface AnalyticsService {

    DashboardSummaryResponseDto getDashboardSummary(DateRangeParams range);

    List<DailySalesPointDto> getDailySales(DateRangeParams range);

    List<OrderStatusMetricDto> getOrderStatusMetrics(DateRangeParams range);
}
