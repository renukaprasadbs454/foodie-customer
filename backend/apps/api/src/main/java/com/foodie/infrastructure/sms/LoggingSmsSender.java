package com.foodie.infrastructure.sms;

import java.util.Arrays;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Development SMS adapter — logs dispatch. Swap without touching Auth module.
 * Plaintext OTP is logged only on {@code local}/{@code dev} profiles (local browser demo).
 * Staging/prod must never log OTP values (Phase3 §15).
 */
@Component
public class LoggingSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingSmsSender.class);
    private static final Set<String> OTP_LOG_PROFILES = Set.of("local", "dev");

    private final Environment environment;

    public LoggingSmsSender(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void sendOtp(String phoneNumber, String otp) {
        if (shouldLogOtpPlaintext()) {
            log.info("OTP for phone ending {} (local/dev only): {}", mask(phoneNumber), otp);
            return;
        }
        log.info("OTP SMS dispatched asynchronously for phone ending {}", mask(phoneNumber));
    }

    private boolean shouldLogOtpPlaintext() {
        return Arrays.stream(environment.getActiveProfiles()).anyMatch(OTP_LOG_PROFILES::contains);
    }

    private static String mask(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) {
            return "****";
        }
        return phoneNumber.substring(0, 4) + "******" + phoneNumber.substring(phoneNumber.length() - 2);
    }
}
