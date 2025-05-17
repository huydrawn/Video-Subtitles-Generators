package com.example.video.editor.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class ProjectDto {
    private Long projectId;
    private String publicId;
    private String projectName;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private VideoDto video; // dùng lại DTO đã tạo
}