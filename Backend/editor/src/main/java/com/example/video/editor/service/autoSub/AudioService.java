package com.example.video.editor.service.autoSub;

import org.springframework.stereotype.Service;

@Service
public class AudioService {

	public String getSrtWithVideoId(int id, String languageCode) throws Exception {
		
		AudioTranscriber transcriber = AudioTranscriberFactory.getTranscriber(languageCode);
		String srtPath = transcriber.transcribe("https://res.cloudinary.com/dq2ibqftf/video/upload/v1745771687/pmrsqdeuosjbli30meys.mp4");

		return srtPath;
	}
}