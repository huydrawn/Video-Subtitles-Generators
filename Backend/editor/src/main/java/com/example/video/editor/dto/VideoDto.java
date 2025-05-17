package com.example.video.editor.dto;

import lombok.Data;

@Data
public class VideoDto {
    private Long videoId;
    private String title;
    private String cloudinaryPublicId;
    private String url;
    private String thumbnailUrl;
    private String secureUrl;
    private String resourceType;
    private String format;
    private Float duration;
    private Long bytes;
    private Integer width;
    private Integer height;
}