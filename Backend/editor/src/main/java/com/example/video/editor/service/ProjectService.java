package com.example.video.editor.service;

import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.Project;
import com.example.video.editor.model.Workspace;
import com.example.video.editor.repository.ProjectRepository;
import com.example.video.editor.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

	private final ProjectRepository projectRepository;
	private final WorkspaceRepository workspaceRepository;

	public Project createProject(Long workspaceId, String projectName, String description) throws NotFoundException {
		Workspace workspace = workspaceRepository.findById(workspaceId)
				.orElseThrow(() -> new NotFoundException("Không tìm thấy Workspace với ID: " + workspaceId));

		Project newProject = Project.builder().workspace(workspace).projectName(projectName).description(description)
				.createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).publicId(UUID.randomUUID().toString())
				.build();

		return projectRepository.save(newProject);
	}

	// Các phương thức khác liên quan đến Project
}