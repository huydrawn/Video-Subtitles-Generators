package com.example.video.editor.service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.util.Map;
import java.util.function.BiConsumer;

import org.springframework.stereotype.Service;

import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.Project;
import com.example.video.editor.model.Video;
import com.example.video.editor.repository.ProjectRepository;
import com.example.video.editor.service.progess.ProgressTask;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SaveSubtitlesService extends ProgressTask {
	private final ProjectRepository projectRepository;
	private final VideoService videoService;

	public File addSubtitleToVideo(File videoFile, File subtitleFile) throws IOException, InterruptedException {
		// Tạo file đầu ra tạm với tên random, định dạng mp4
		File outputVideo = Files.createTempFile("video-with-subtitle-", ".mp4").toFile();

		String subtitlePath = subtitleFile.getAbsolutePath().replace("\\", "\\\\");
		subtitlePath = subtitlePath.replace(":", "\\:");

		String videoPath = videoFile.getAbsolutePath().replace("\\", "\\\\");
		String outputPath = outputVideo.getAbsolutePath().replace("\\", "\\\\");

		ProcessBuilder pb = new ProcessBuilder("ffmpeg", "-i", videoPath, "-vf", "ass=\'" + subtitlePath + "\'", "-c:a",
				"copy", outputPath);

		Map<String, String> env = pb.environment();
		env.put("PYTHONIOENCODING", "utf-8");
		pb.redirectErrorStream(true);

		Process process = pb.start();

		// Đọc log ffmpeg (để debug, có thể bỏ qua)
		try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
			String line;
			while ((line = reader.readLine()) != null) {
				
			}
		}

		int exitCode = process.waitFor();
		if (exitCode != 0) {
			throw new RuntimeException("FFmpeg process failed with exit code " + exitCode);
		}

		return outputVideo;
	}

	private File loadFileFromCloudinaryVideoUrl(String videoUrl) throws IOException {
		URL url = new URL(videoUrl);
		HttpURLConnection connection = (HttpURLConnection) url.openConnection();
		connection.setRequestMethod("GET");
		connection.setConnectTimeout(10000); // optional timeout
		connection.setReadTimeout(10000);

		// Tạo file tạm để lưu video
		File tempFile = Files.createTempFile("video-", ".mp4").toFile();

		try (InputStream inputStream = connection.getInputStream();
				FileOutputStream outputStream = new FileOutputStream(tempFile)) {
			byte[] buffer = new byte[8192];
			int bytesRead;
			while ((bytesRead = inputStream.read(buffer)) != -1) {
				outputStream.write(buffer, bytesRead, bytesRead);
			}
		}

		connection.disconnect();

		return tempFile;
	}

	@Override
	protected void executeTask(BiConsumer<Integer, String> progressCallback,
			BiConsumer<Object, String> completeCallback, BiConsumer<String, String> errorCallback, Object... params)
			throws Exception {
		byte[] fileSub = (byte[]) params[0];
		String projectPublicId = (String) params[1];

		Project project = projectRepository.findByPublicId(projectPublicId)
				.orElseThrow(() -> new NotFoundException(projectPublicId));

		Video video = project.getVideo();

		String urlVideo = video.getUrl();

		File videoFile = loadFileFromCloudinaryVideoUrl(urlVideo);

		File tempAssFile = File.createTempFile("subtitle-", ".ass");
		Files.write(tempAssFile.toPath(), fileSub);
		
		File subbedFile = addSubtitleToVideo(videoFile, tempAssFile);
		
		Video newVideo = videoService.uploadVideoToCloudinary(Files.readAllBytes(subbedFile.toPath()), subbedFile.getName());
		
		
		project.setVideo(newVideo);
		
		projectRepository.save(project);
	}

}
