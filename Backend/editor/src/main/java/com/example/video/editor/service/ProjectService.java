package com.example.video.editor.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.example.video.editor.dto.ProjectDto;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.mapstruct.ProjectMapper;
import com.example.video.editor.model.Project;
import com.example.video.editor.model.Workspace;
import com.example.video.editor.repository.ProjectRepository;
import com.example.video.editor.repository.WorkspaceRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

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

	public void reName(String projectPublicId, String newName) throws NotFoundException {
		Project project = projectRepository.findByPublicId(projectPublicId)
				.orElseThrow(() -> new NotFoundException("Không tìm thấy Workspace với public ID: " + projectPublicId));
		;
		project.setProjectName(newName);
		projectRepository.save(project);
	}

	@Transactional
	public void delete(String projectPublicId) {
		Project project = projectRepository.findByPublicId(projectPublicId)
				.orElseThrow(() -> new RuntimeException("Project not found with publicId: " + projectPublicId));

		Workspace workspace = project.getWorkspace();

		if (workspace != null) {
			workspace.getProjects().remove(project); // Gỡ khỏi set
			project.setWorkspace(null); // Gỡ liên kết ngược
			workspaceRepository.save(workspace); // Hibernate sẽ xóa project nhờ orphanRemoval = true
		} else {
			// Trường hợp project không gắn với workspace, xóa trực tiếp
			projectRepository.delete(project);
		}
	}
}