package com.example.video.editor.service;

import java.util.List;
import java.util.function.BiConsumer;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.video.editor.dto.TranscriptionRequest;
import com.example.video.editor.dto.TranscriptionResponse;
import com.example.video.editor.model.SrtSegment;
import com.example.video.editor.service.progess.ProgressTask;

@Service
public class TranscriptionService extends ProgressTask {

	@Autowired
	private RestTemplate restTemplate;

	public List<SrtSegment> transcribe(String videoUrl, String language) {
		String pythonApiUrl = "http://localhost:5001/transcribe";

		TranscriptionRequest request = new TranscriptionRequest();
		request.setUrl(videoUrl);
		request.setLanguage(language);

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);

		HttpEntity<TranscriptionRequest> entity = new HttpEntity<>(request, headers);

		ResponseEntity<TranscriptionResponse> response = restTemplate.exchange(pythonApiUrl, HttpMethod.POST, entity,
				TranscriptionResponse.class);

		return response.getBody().getSrt();
	}

	@Override
	protected void executeTask(BiConsumer<Integer, String> progressCallback,
			BiConsumer<Object, String> completeCallback, BiConsumer<String, String> errorCallback, Object... params)
			throws Exception {

		progressCallback.accept(0, null);
		String videoUrl = (String) params[0];
		String lang = (String) params[1];
		progressCallback.accept(5, null);
		String pythonApiUrl = "http://localhost:5001/transcribe";

		TranscriptionRequest request = new TranscriptionRequest();
		request.setUrl(videoUrl);
		request.setLanguage(lang);
		progressCallback.accept(10, null);

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);

		HttpEntity<TranscriptionRequest> entity = new HttpEntity<>(request, headers);

		ResponseEntity<TranscriptionResponse> response = restTemplate.exchange(pythonApiUrl, HttpMethod.POST, entity,
				TranscriptionResponse.class);
		progressCallback.accept(100, null);
		var srt = response.getBody().getSrt();
		completeCallback.accept(srt, "success");
		// TODO Auto-generated method stub

	}
}