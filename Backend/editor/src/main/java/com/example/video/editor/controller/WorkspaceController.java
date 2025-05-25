package com.example.video.editor.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.dto.RenameRequest;
import com.example.video.editor.dto.WorkspaceDto;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.mapstruct.WorkspaceMapper;
import com.example.video.editor.model.SecurityUser;
import com.example.video.editor.model.Workspace;
import com.example.video.editor.service.WorkspaceService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/workspaces/{publicId}")
@RequiredArgsConstructor
public class WorkspaceController {
	private final WorkspaceService workspaceService;
	private final WorkspaceMapper workspaceMapper;

	@GetMapping
	public ResponseEntity<WorkspaceDto> getWorkspaceByPublicId(@PathVariable String publicId) throws NotFoundException {
		Workspace workspace = workspaceService.getByPublicId(publicId);
		WorkspaceDto dto = workspaceMapper.toDto(workspace);
		return ResponseEntity.ok(dto);
	}

	@PutMapping
	@PreAuthorize("@workspacePermission.hasAccess(#user.userId, #workspacePublicId)")
	public ResponseEntity<?> reName(RenameRequest dto, @AuthenticationPrincipal SecurityUser user)
			throws NotFoundException {
		workspaceService.rename(user.getUserId(), dto.getNewName());
		return ResponseEntity.ok("Success");
	}

}