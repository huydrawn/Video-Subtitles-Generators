package com.example.video.editor.controller;

import java.io.IOException;
import java.util.Collections;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.video.editor.model.SecurityUser;
import com.example.video.editor.service.CloudinaryService;
import com.example.video.editor.service.SaveSubtitlesService;
import com.example.video.editor.service.progess.TaskProcessingService;

@RestController
@RequestMapping("/sub")
public class SubtitlesController {
	@Autowired
	CloudinaryService cloudinaryService;
	@Autowired
	TaskProcessingService taskProcessingService;
	@Autowired
	SaveSubtitlesService saveSubtitlesService;

	@PostMapping("/upload")
	public ResponseEntity<String> uploadVideo(@RequestParam("file") MultipartFile file) throws IOException {
		if (file.isEmpty()) {
			return ResponseEntity.badRequest().body("File is empty");
		}
		String url = cloudinaryService.uploadFile(file);
		return ResponseEntity.ok("Video uploaded successfully: " + url);
	}

	@PostMapping("/{workspacePublicId}/{projectPublicId}")
	@PreAuthorize("@workspacePermission.hasAccess(#user.userId, #workspacePublicId)")
	public ResponseEntity<?> addSubtitle(@RequestParam("file") MultipartFile subtitleFile,
			@AuthenticationPrincipal SecurityUser user, String workspacePublicId, String projectPublicId)
			throws IOException {
		byte[] fileSub = subtitleFile.getBytes();
		var taskId = taskProcessingService.startProgressTask(saveSubtitlesService, fileSub, projectPublicId);
		return ResponseEntity.ok(taskId);
	}

}
