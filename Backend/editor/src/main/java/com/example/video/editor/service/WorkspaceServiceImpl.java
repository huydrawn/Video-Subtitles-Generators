package com.example.video.editor.service;

import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.mapstruct.ProjectMapper;
import com.example.video.editor.mapstruct.VideoMapper;
import com.example.video.editor.model.User;
import com.example.video.editor.model.Workspace;
import com.example.video.editor.repository.UserRepository;
import com.example.video.editor.repository.WorkspaceRepository;

import lombok.RequiredArgsConstructor;
@Component
@Service
@RequiredArgsConstructor
public class WorkspaceServiceImpl implements WorkspaceService {
	private final UserRepository userRepository;
	private final WorkspaceRepository workspaceRepository;

	@Override
	public Workspace getByPublicId(String publicId) throws NotFoundException {
		return workspaceRepository.findByPublicId(publicId)
				.orElseThrow(() -> new NotFoundException("Workspace not found with publicId: " + publicId));
	}

	@Override
	public void rename(Long userId, String newName) throws NotFoundException {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new NotFoundException("Workspace not found with publicId: " + userId));
		user.getWorkspace().setWorkspaceName(newName);
		userRepository.save(user);
	}

}