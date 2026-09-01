package com.foodie.auth.exception;

import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.UnauthorizedException;

public class OtpExpiredException extends UnauthorizedException {
    public OtpExpiredException() {
        super(ErrorCode.OTP_EXPIRED, "OTP has expired. Request a new one.");
    }
}
