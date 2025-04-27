package com.example.video.editor.service.autoSub;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;

import org.springframework.core.io.ClassPathResource;

public class SubtitleService {
	private static final String BASE_PATH = "/python";
	private static final String PYTHON_PATH = "python"; // hoặc "python"
	private static final String PYTHON_NAME_FILE = "/autoSub.py";

	public static String generateSubtitleFromVideo(String videoUrl, String modelName) throws Exception {
		// Lấy đường dẫn thực tế đến generate_srt.py từ resources
		File scriptFile = new ClassPathResource(BASE_PATH + PYTHON_NAME_FILE).getFile();
		String scriptPath = scriptFile.getAbsolutePath();

		// Lấy đường dẫn thực tế đến vosk model từ resources
		File modelFolder = new ClassPathResource(BASE_PATH + modelName).getFile();
		String modelPath = modelFolder.getAbsolutePath();
		ProcessBuilder pb = new ProcessBuilder(PYTHON_PATH, scriptPath, videoUrl, modelPath);
		System.out.printf("%s %s %s %s",PYTHON_PATH, scriptPath, videoUrl, modelPath);
		pb.redirectErrorStream(true); // gộp stdout + stderr

		Process process = pb.start();

		StringBuilder srtContent = new StringBuilder();

		// Đọc luôn kết quả trả về từ Python
		try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
			String line;
			while ((line = reader.readLine()) != null) {
				srtContent.append(line).append("\n");
			}
		}

		int exitCode = process.waitFor();
		if (exitCode != 0) {
			throw new RuntimeException("Python script failed with exit code " + exitCode);
		}

		return srtContent.toString();
	}
}