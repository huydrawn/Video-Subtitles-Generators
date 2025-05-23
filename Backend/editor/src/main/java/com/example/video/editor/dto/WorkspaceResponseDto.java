package com.example.video.editor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class WorkspaceResponseDto {
    private Long workspaceId;
    private String name;
    private String description;
}