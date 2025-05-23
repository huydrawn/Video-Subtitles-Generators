package com.example.video.editor.dto;

import java.time.LocalDateTime;
import java.util.Set;

import lombok.Data;

@Data
public class WorkspaceDto {
    private Long workspaceId;
    private String publicId;
    private String workspaceName;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Set<ProjectDto> projects;  // dùng ProjectDto đã có
}