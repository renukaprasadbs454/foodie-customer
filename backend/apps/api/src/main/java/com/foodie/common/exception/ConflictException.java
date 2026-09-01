package com.foodie.common.exception;

public class ConflictException extends BaseException {

    private final Object data;

    public ConflictException(ErrorCode errorCode, String message) {
        this(errorCode, message, null);
    }

    public ConflictException(ErrorCode errorCode, String message, Object data) {
        super(errorCode, message);
        this.data = data;
    }

    public ConflictException(String message) {
        this(ErrorCode.CONFLICT, message, null);
    }

    public Object getData() {
        return data;
    }
}
