package com.foodie.common.exception;

public class UnprocessableEntityException extends BaseException {
    public UnprocessableEntityException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
}
