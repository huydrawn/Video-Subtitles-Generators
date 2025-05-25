package com.example.video.editor.controller;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;
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