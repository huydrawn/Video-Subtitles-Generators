package com.example.video.editor.controller;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.video.editor.service.CloudinaryService;
import com.example.video.editor.service.autoSub.AudioService;
import com.example.video.editor.service.progess.TaskProcessingService;

@RestController
@RequestMapping("/sub")
public class SubtitlesController {
	@Autowired
	CloudinaryService cloudinaryService;
	@Autowired
	AudioService audioService;
	@Autowired
	TaskProcessingService taskProcessingService;

	@PostMapping("/upload")
	public ResponseEntity<String> uploadVideo(@RequestParam("file") MultipartFile file) throws IOException {
		if (file.isEmpty()) {
			return ResponseEntity.badRequest().body("File is empty");
		}
		String url = cloudinaryService.uploadFile(file);
		return ResponseEntity.ok("Video uploaded successfully: " + url);
	}

	@PostMapping("/test")
	public ResponseEntity<String> upload() throws Exception {
		String id = taskProcessingService.startProgressTask(new Test()); 
		return ResponseEntity.ok(id);
	}
}
