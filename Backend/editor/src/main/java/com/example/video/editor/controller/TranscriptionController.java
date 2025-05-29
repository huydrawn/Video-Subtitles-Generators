package com.example.video.editor.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.dto.TranscriptionRequest;
import com.example.video.editor.service.TranscriptionService;
import com.example.video.editor.service.progess.TaskProcessingService;

@RestController
@RequestMapping("/api/subtitles")
public class TranscriptionController {
	@Autowired
	private TaskProcessingService taskProcessingService;
	@Autowired
	private TranscriptionService transcriptionService;

	@PostMapping
	public ResponseEntity<?> getSrt(@RequestBody TranscriptionRequest request) {
		var taskId = taskProcessingService.startProgressTask(transcriptionService, request);
		return ResponseEntity.ok(taskId);
	}
}