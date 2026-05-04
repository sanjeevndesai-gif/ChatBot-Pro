package com.arnan.userservice.enums;

public enum UserPlan {

    FREE("0"),
    PREMIUM("1");

    private final String code;

    UserPlan(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}