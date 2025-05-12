package com.example.video.editor.dto;

import lombok.Data;

@Data
public class WorkspaceCreationRequest {
    private String workspaceName;
    private String description;
}