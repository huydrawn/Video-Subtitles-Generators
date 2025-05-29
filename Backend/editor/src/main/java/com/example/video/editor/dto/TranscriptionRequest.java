package com.example.video.editor.dto;

import lombok.Data;

@Data
public class TranscriptionRequest {
	private String url;
	private String language;
	private boolean translate;
	// Getters and Setters
}