package com.example.video.editor.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.dto.ProjectCreationRequest;
import com.example.video.editor.dto.RenameRequest;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.SecurityUser;
import com.example.video.editor.service.ProjectService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/workspace/{workspacePublicId}/projects")
@RequiredArgsConstructor
public class ProjectController {

	private final ProjectService projectService;

	@PostMapping
	@PreAuthorize("@workspacePermission.hasAccess(#user.userId, #workspacePublicId)")
	public ResponseEntity<?> createProject(@PathVariable String workspacePublicId,
			@RequestBody ProjectCreationRequest request, @AuthenticationPrincipal SecurityUser user)
			throws NotFoundException {
		var dto = projectService.createProject(workspacePublicId, request.getProjectName(), request.getDescription());
		return new ResponseEntity<>(dto, HttpStatus.CREATED);
	}

	@PostMapping("/{projectPublicId}")
	@PreAuthorize("@workspacePermission.hasAccess(#user.userId, #workspacePublicId)")
	public ResponseEntity<?> rename(@PathVariable String workspacePublicId, @PathVariable String projectPublicId,
			@RequestBody RenameRequest request) throws NotFoundException {
		projectService.reName(projectPublicId, request.getNewName());
		return new ResponseEntity<>(HttpStatus.OK);
	}

	@DeleteMapping("/{projectPublicId}")
	@PreAuthorize("@workspacePermission.hasAccess(#user.userId, #workspacePublicId)")
	public ResponseEntity<?> delete(@PathVariable String workspacePublicId, @PathVariable String projectPublicId,
			@RequestBody RenameRequest request) throws NotFoundException {

		projectService.delete(projectPublicId);
		return new ResponseEntity<>(HttpStatus.OK);
	}

}