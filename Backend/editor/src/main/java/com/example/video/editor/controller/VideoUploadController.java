package com.example.video.editor.controller;

import java.io.IOException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.video.editor.service.FileUploadService;
import com.example.video.editor.service.progess.TaskProcessingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/projects")
public class VideoUploadController {
	private final TaskProcessingService taskProcessingService;
	private final FileUploadService fileUploadService;

	@PostMapping("/{publicProjectId}/videos")
	public ResponseEntity<String> uploadVideoToProject(@RequestParam("file") MultipartFile file,
			@PathVariable String publicProjectId) throws IOException {

		byte[] fileBytes = file.getBytes();
		String id = taskProcessingService.startProgressTask(fileUploadService, fileBytes, file.getOriginalFilename(),
				publicProjectId);
		return ResponseEntity.ok(id);
	}
}
