package com.foodie.infrastructure.sms;

public interface SmsSender {
    void sendOtp(String phoneNumber, String otp);
}
