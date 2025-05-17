package com.example.video.editor.service;

import com.example.video.editor.dto.ProjectDto;
import com.example.video.editor.dto.ProjectResponse;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.mapstruct.ProjectMapper;
import com.example.video.editor.mapstruct.VideoMapper;
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
	private final ProjectMapper projectMapper;

	public ProjectDto createProject(String workspacePublicId, String projectName, String description)
			throws NotFoundException {
		Workspace workspace = workspaceRepository.findByPublicId(workspacePublicId).orElseThrow(
				() -> new NotFoundException("Không tìm thấy Workspace với public ID: " + workspacePublicId));

		Project newProject = Project.builder().workspace(workspace).projectName(projectName).description(description)
				.createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).publicId(UUID.randomUUID().toString())
				.build();
		Project project = projectRepository.save(newProject);

		return projectMapper.toDto(project);
	}

	// Các phương thức khác liên quan đến Project
}