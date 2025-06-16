package com.example.video.editor.mapstruct;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.video.editor.dto.WorkspaceDto;
import com.example.video.editor.model.Workspace;

@Mapper(componentModel = "spring", uses = { ProjectMapper.class })
public interface WorkspaceMapper {

	@Mapping(target = "projects", source = "projects")
	WorkspaceDto toDto(Workspace workspace);
}