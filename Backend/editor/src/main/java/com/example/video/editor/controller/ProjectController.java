package com.example.video.editor.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.dto.ProjectCreationRequest;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.Project;
import com.example.video.editor.service.ProjectService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<Project> createProject(
            @PathVariable Long workspaceId,
            @RequestBody ProjectCreationRequest request) throws NotFoundException {
        Project newProject = projectService.createProject(
                workspaceId,
                request.getProjectName(),
                request.getDescription()
        );
        return new ResponseEntity<>(newProject, HttpStatus.CREATED);
    }
}