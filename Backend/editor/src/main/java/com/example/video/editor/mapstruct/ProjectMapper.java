package com.example.video.editor.mapstruct;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.video.editor.dto.ProjectDto;
import com.example.video.editor.model.Project;

@Mapper(componentModel = "spring", uses = { VideoMapper.class })
public interface ProjectMapper {

    @Mapping(target = "video", source = "video")
    ProjectDto toDto(Project project);
}