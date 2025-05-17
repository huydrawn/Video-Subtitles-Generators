package com.example.video.editor.dto;

import java.util.List;

import com.example.video.editor.model.SrtSegment;

import lombok.Data;
@Data
public class TranscriptionResponse {
	private String status;
	private List<SrtSegment> srt;

	// Getters and Setters
}