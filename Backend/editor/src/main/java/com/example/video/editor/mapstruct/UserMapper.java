package com.example.video.editor.mapstruct;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.video.editor.dto.UserDTO;
import com.example.video.editor.model.User;

@Mapper(componentModel = "spring", uses = { WorkspaceMapper.class })
public interface UserMapper {
	@Mapping(target = "workspace", source = "workspace")
    UserDTO toDto(User user);
}
