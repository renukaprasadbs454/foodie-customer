package com.foodie.auth;

import com.foodie.infrastructure.sms.SmsSender;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class CapturingSmsSender implements SmsSender {

    private final Map<String, String> lastOtpByPhone = new ConcurrentHashMap<>();

    @Override
    public void sendOtp(String phoneNumber, String otp) {
        lastOtpByPhone.put(phoneNumber, otp);
    }

    public String lastOtp(String phoneNumber) {
        return lastOtpByPhone.get(phoneNumber);
    }
}
