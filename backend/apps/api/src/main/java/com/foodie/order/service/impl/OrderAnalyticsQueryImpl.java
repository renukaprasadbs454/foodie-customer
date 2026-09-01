package com.foodie.order.service.impl;

import com.foodie.order.repository.OrderAnalyticsProjectionRepository;
import com.foodie.shared.contract.OrderAnalyticsQuery;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderAnalyticsQueryImpl implements OrderAnalyticsQuery {

    private final OrderAnalyticsProjectionRepository repository;

    public OrderAnalyticsQueryImpl(OrderAnalyticsProjectionRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public long countPlacedBetween(Instant fromInclusive, Instant toExclusive) {
        return repository.countPlacedBetween(fromInclusive, toExclusive);
    }

    @Override
    @Transactional(readOnly = true)
    public long countDistinctRestaurantsWithOrdersBetween(Instant fromInclusive, Instant toExclusive) {
        return repository.countDistinctRestaurantsWithOrdersBetween(fromInclusive, toExclusive);
    }

    @Override
    @Transactional(readOnly = true)
    public long countDistinctPartnersWithOrdersBetween(Instant fromInclusive, Instant toExclusive) {
        return repository.countDistinctPartnersWithOrdersBetween(fromInclusive, toExclusive);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatusCountRow> countByStatusPlacedBetween(Instant fromInclusive, Instant toExclusive) {
        List<StatusCountRow> rows = new ArrayList<>();
        for (Object[] row : repository.countByStatusPlacedBetween(fromInclusive, toExclusive)) {
            rows.add(new StatusCountRow(String.valueOf(row[0]), ((Number) row[1]).longValue()));
        }
        return rows;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DailySalesRow> dailySalesByPlacedAt(Instant fromInclusive, Instant toExclusive) {
        List<DailySalesRow> rows = new ArrayList<>();
        for (Object[] row : repository.dailySalesByPlacedAt(fromInclusive, toExclusive)) {
            LocalDate date = toLocalDate(row[0]);
            long orderCount = ((Number) row[1]).longValue();
            BigDecimal revenue = row[2] == null
                    ? BigDecimal.ZERO.setScale(2)
                    : new BigDecimal(row[2].toString()).setScale(2, java.math.RoundingMode.HALF_UP);
            rows.add(new DailySalesRow(date, orderCount, revenue));
        }
        return rows;
    }

    private static LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        return LocalDate.parse(value.toString());
    }
}
