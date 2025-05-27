package com.example.video.editor.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.client.PythonTranscriptionClient;
import com.example.video.editor.dto.TranscriptionRequest;
import com.example.video.editor.model.SrtSegment;
import com.example.video.editor.service.TranscriptionService;

@RestController
@RequestMapping("/api/subtitles")
public class TranscriptionController {

	@Autowired
	private PythonTranscriptionClient pythonTranscriptionClient;

	@PostMapping
	public ResponseEntity<List<SrtSegment>> getSrt(@RequestBody TranscriptionRequest request) {
		var x = pythonTranscriptionClient.transcribe(request).getSrt();
		return ResponseEntity.ok(x);
	}
}