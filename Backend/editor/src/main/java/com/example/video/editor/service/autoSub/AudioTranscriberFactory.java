package com.example.video.editor.service.autoSub;

public class AudioTranscriberFactory {

	public static AudioTranscriber getTranscriber(String languageCode) {
		switch (languageCode.toLowerCase()) {
		case "vi":
			return new VietnameseTranscriber();
		default:
			throw new IllegalArgumentException("Unsupported language: " + languageCode);
		}
	}
}