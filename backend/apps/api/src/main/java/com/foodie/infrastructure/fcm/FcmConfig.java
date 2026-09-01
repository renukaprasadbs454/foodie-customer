package com.foodie.infrastructure.fcm;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(FcmProperties.class)
public class FcmConfig {

    @Bean
    FcmClient fcmClient(FcmProperties properties) {
        FcmClient inner = properties.isStub()
                ? new StubFcmClient()
                : new LiveFcmClient(properties);
        return new RetryingFcmClient(inner, properties.getMaxAttempts());
    }
}
