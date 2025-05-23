package com.example.video.editor.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class UserDTO {
	private Long userId;
	private String username;
	private String email;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	private String status;
	private WorkspaceDto workspace;
}