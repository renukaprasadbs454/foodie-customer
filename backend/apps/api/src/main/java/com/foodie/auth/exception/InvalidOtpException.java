package com.foodie.auth.exception;

import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.UnauthorizedException;

public class InvalidOtpException extends UnauthorizedException {
    public InvalidOtpException() {
        super(ErrorCode.INVALID_OTP, "Invalid OTP.");
    }
}
