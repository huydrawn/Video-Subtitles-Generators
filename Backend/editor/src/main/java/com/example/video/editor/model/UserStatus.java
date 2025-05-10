package com.example.video.editor.model;

public enum UserStatus {
    ACTIVE("Active"),
    INACTIVE("Inactive"),
    PENDING("Pending"),
    BLOCKED("Blocked");

    private final String displayName;

    UserStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}