package com.foodie.order.service.impl;

import com.foodie.order.service.OrderNumberGenerator;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Human-readable order numbers: FD-yyyyMMdd-###### (Phase3 §3.5).
 */
@Component
public class RedisOrderNumberGenerator implements OrderNumberGenerator {

    private static final DateTimeFormatter DAY = DateTimeFormatter.BASIC_ISO_DATE;

    private final StringRedisTemplate redisTemplate;
    private final Clock clock;

    @Autowired
    public RedisOrderNumberGenerator(StringRedisTemplate redisTemplate) {
        this(redisTemplate, Clock.systemUTC());
    }

    public RedisOrderNumberGenerator(StringRedisTemplate redisTemplate, Clock clock) {
        this.redisTemplate = redisTemplate;
        this.clock = clock;
    }

    @Override
    public String next() {
        LocalDate day = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        String dayKey = day.format(DAY);
        Long seq = redisTemplate.opsForValue().increment("order:number:" + dayKey);
        if (seq == null) {
            seq = 1L;
        }
        return "FD-" + dayKey + "-" + String.format("%06d", seq);
    }
}
