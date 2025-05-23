package com.example.video.editor.controller;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/test")
@RequiredArgsConstructor
public class TestController {
	private final Cloudinary cloudinary;

	@GetMapping
	public ResponseEntity<String> ok() throws IOException {

		return ResponseEntity.ok("ok");
	}

	@PostMapping
	public ResponseEntity<String> uploadVideoToProject(@RequestParam("file") MultipartFile file) throws IOException {
		Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap("resource_type", "video", // video
				"folder", "my_videos" // 👈 bạn có thể đổi tên folder
		));
		var x = uploadResult.get("url");
		return ResponseEntity.ok(x + "");
	}

	@PostMapping("/ok")
	public ResponseEntity<String> hi() throws IOException {
 
		return ResponseEntity.ok("hiiiii");
	}
}
