package com.example.video.editor.dto;

import com.example.video.editor.model.User;

import lombok.Data;

@Data
public class UserResponse {
    private Long userId;
    private String username;
    private String email;
    private String status;

    // Constructor nhận entity User để mapping dữ liệu
    public UserResponse(User user) {
        this.userId = user.getUserId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.status = user.getStatus().getDisplayName(); // Hoặc user.getStatus().name()
    }
}