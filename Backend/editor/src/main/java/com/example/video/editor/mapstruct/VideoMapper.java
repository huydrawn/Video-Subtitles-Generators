package com.example.video.editor.mapstruct;

import org.mapstruct.Mapper;

import com.example.video.editor.dto.VideoDto;
import com.example.video.editor.model.Video;

@Mapper(componentModel = "spring")
public interface VideoMapper {
	VideoDto toDto(Video video);
}