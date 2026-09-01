package com.foodie.infrastructure.razorpay;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(RazorpayProperties.class)
public class RazorpayConfig {

    @Bean
    RazorpayClient razorpayClient(RazorpayProperties properties, ObjectMapper objectMapper) {
        RazorpayClient inner = properties.isStub()
                ? new StubRazorpayClient()
                : new LiveRazorpayClient(properties, objectMapper);
        return new RetryingRazorpayClient(inner);
    }
}
