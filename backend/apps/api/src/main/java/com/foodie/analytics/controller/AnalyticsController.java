package com.foodie.analytics.controller;

import com.foodie.analytics.dto.request.DateRangeParams;
import com.foodie.analytics.dto.response.DailySalesPointDto;
import com.foodie.analytics.dto.response.DashboardSummaryResponseDto;
import com.foodie.analytics.dto.response.OrderStatusMetricDto;
import com.foodie.analytics.service.AnalyticsService;
import com.foodie.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
@Tag(name = "Analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard-summary")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Platform dashboard summary for a date range")
    public ResponseEntity<ApiResponse<DashboardSummaryResponseDto>> dashboardSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getDashboardSummary(new DateRangeParams(dateFrom, dateTo))));
    }

    @GetMapping("/daily-sales")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'FINANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Daily order count and revenue series")
    public ResponseEntity<ApiResponse<List<DailySalesPointDto>>> dailySales(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getDailySales(new DateRangeParams(dateFrom, dateTo))));
    }

    @GetMapping("/order-status-metrics")
    @PreAuthorize("hasRole('ADMIN') and @adminAccess.hasAnyRole(authentication, 'OPS', 'SUPER_ADMIN')")
    @Operation(summary = "Order status mix including REJECTED/CANCELLED")
    public ResponseEntity<ApiResponse<List<OrderStatusMetricDto>>> orderStatusMetrics(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getOrderStatusMetrics(new DateRangeParams(dateFrom, dateTo))));
    }
}
