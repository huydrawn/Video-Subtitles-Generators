package com.example.video.editor.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.example.video.editor.dto.TranscriptionRequest;
import com.example.video.editor.dto.TranscriptionResponse;

@FeignClient(name = "pythonTranscriptionClient", url = "http://localhost:5001")
public interface PythonTranscriptionClient  {
	@PostMapping("/transcribe")
	TranscriptionResponse transcribe(@RequestBody TranscriptionRequest request);
}
