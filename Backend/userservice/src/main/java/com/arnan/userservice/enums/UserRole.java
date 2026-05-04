package com.arnan.userservice.enums;

public enum UserRole {

    ADMIN("0"),
    USER("1");

    private final String code;

    UserRole(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}