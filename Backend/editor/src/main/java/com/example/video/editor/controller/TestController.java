package com.example.video.editor.controller;

import java.io.IOException;
import java.util.Collections;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.video.editor.service.SaveSubtitlesService;
import com.example.video.editor.service.progess.TaskProcessingService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/test")
@RequiredArgsConstructor
public class TestController {
	private final TaskProcessingService taskProcessingService;
	private final SaveSubtitlesService saveSubtitlesService;

	@GetMapping
	public ResponseEntity<String> ok() throws IOException {

		return ResponseEntity.ok("ok");
	}

//	@PostMapping
//	public ResponseEntity<?> addSubtitle(@RequestParam("file") MultipartFile subtitleFile) throws IOException {
//		byte[] fileSub = subtitleFile.getBytes();
//		var taskId = taskProcessingService.startProgressTask(saveSubtitlesService, fileSub);
//		return ResponseEntity.ok(Collections.singletonMap("url", taskId));
//	}
	@PostMapping("/{publicProjectId}/subtitles")
	public ResponseEntity<?> addSubtitle(@RequestParam("file") MultipartFile subtitleFile,
			@PathVariable String publicProjectId) throws IOException {
		byte[] fileSub = subtitleFile.getBytes();
		var taskId = taskProcessingService.startProgressTask(saveSubtitlesService, fileSub, publicProjectId);
		return ResponseEntity.ok(Collections.singletonMap("url", taskId)); // <--- Vấn đề nằm ở đây
	}

	@PostMapping("/ok")
	public ResponseEntity<String> hi(@Valid @RequestBody TestDto dto) throws IOException {

		return ResponseEntity.ok("hiiiii");
	}

}

@Data
class TestDto {
	@NotEmpty(message = "test không được để trống")
	@Size(min = 3, message = "test phải có ít nhất 3 ký tự")
	private String test;
}