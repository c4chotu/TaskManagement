package com.taskflow.common.exception;

import org.springframework.http.HttpStatus;

public class TenantIsolationException extends BaseException {
    public TenantIsolationException(String message) {
        super(message, "TENANT_ISOLATION_ERROR", HttpStatus.BAD_REQUEST);
    }
}
