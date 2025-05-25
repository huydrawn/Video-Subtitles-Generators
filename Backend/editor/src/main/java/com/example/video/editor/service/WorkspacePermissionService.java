package com.example.video.editor.service;

import org.springframework.stereotype.Component;

import com.example.video.editor.repository.WorkspaceRepository;

import lombok.RequiredArgsConstructor;

@Component("workspacePermission")
@RequiredArgsConstructor
public class WorkspacePermissionService {

	private final WorkspaceRepository workspaceRepository;

	public boolean hasAccess(Long userId, String workspacePublicId) {
		return workspaceRepository.hasPermission(userId, workspacePublicId);
	}
}