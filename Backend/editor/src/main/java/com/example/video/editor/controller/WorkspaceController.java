package com.example.video.editor.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.dto.WorkspaceDto;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.mapstruct.ProjectMapper;
import com.example.video.editor.mapstruct.VideoMapper;
import com.example.video.editor.mapstruct.WorkspaceMapper;
import com.example.video.editor.model.Workspace;
import com.example.video.editor.service.WorkspaceService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {

	private final WorkspaceService workspaceService;
	private final WorkspaceMapper workspaceMapper;

	@GetMapping("/{publicId}")
	public ResponseEntity<WorkspaceDto> getWorkspaceByPublicId(@PathVariable String publicId) throws NotFoundException {
		Workspace workspace = workspaceService.getByPublicId(publicId);
		WorkspaceDto dto = workspaceMapper.toDto(workspace);
		return ResponseEntity.ok(dto);
	}
}