package com.arnan.userservice.enums;

public enum UserStatus {

    INACTIVE("0"),
    ACTIVE("1"),
    EXPIRED("2");

    private final String code;

    UserStatus(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}