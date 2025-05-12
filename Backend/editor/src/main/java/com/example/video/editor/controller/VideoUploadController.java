package com.example.video.editor.controller;

import java.util.Map;

import org.apache.tomcat.util.http.fileupload.FileUpload;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.video.editor.service.FileUploadService;
import com.example.video.editor.service.progess.TaskProcessingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class VideoUploadController {
	private final TaskProcessingService taskProcessingService;
	private final FileUploadService fileUploadService;

	@PostMapping("/api/projects/{publicProjectId}/videos")
	public ResponseEntity<String> uploadVideoToProject(@RequestParam("file") MultipartFile file,
			@PathVariable String publicProjectId) {
		String id = taskProcessingService.startProgressTask(fileUploadService, file, publicProjectId);
		return ResponseEntity.ok(id);
	}
}
