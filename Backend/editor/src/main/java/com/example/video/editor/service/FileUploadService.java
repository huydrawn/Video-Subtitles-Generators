package com.example.video.editor.service;

import java.io.IOException;
import java.util.function.BiConsumer;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.Project;
import com.example.video.editor.model.Video;
import com.example.video.editor.repository.ProjectRepository;
import com.example.video.editor.repository.VideoRepository;
import com.example.video.editor.service.progess.ProgressTask;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FileUploadService extends ProgressTask {
	public final ProjectRepository projectRepository;
	public final VideoService videoService;
	public final VideoRepository videoRepository;

	@Override
	protected void executeTask(BiConsumer<Integer, String> progressCallback,
			BiConsumer<Object, String> completeCallback, BiConsumer<String, String> errorCallback, Object... params)
			throws Exception {
		MultipartFile file = (MultipartFile) params[0];
		String publicProjectId = (String) params[1];

		progressCallback.accept(0, "Bắt đầu xử lý video");

		Project project = null;
		Video savedVideo = null;
		try {
			project = projectRepository.findByPublicId(publicProjectId)
					.orElseThrow(() -> new NotFoundException("Không tìm thấy Project với ID: " + publicProjectId));
			progressCallback.accept(10, "Đã tìm thấy Project");

			// Tải video lên Cloudinary
			Video video = videoService.uploadVideoToCloudinary(file, file.getOriginalFilename());
			progressCallback.accept(70, "Tải video lên Cloudinary thành công");

			savedVideo = videoRepository.save(video);
			progressCallback.accept(90, "Lưu thông tin video vào database thành công");
			completeCallback.accept(savedVideo, "Xử lý video hoàn tất");

			// Liên kết video với project
			project.setVideo(savedVideo);
			projectRepository.save(project); // Gọi ProjectService để save project

		} catch (NotFoundException e) {
			errorCallback.accept("PROJECT_NOT_FOUND", e.getMessage());
		} catch (IOException e) {
			errorCallback.accept("CLOUDINARY_UPLOAD_FAILED", "Lỗi khi tải video lên Cloudinary: " + e.getMessage());
		} catch (Exception e) {
			errorCallback.accept("DATABASE_ERROR",
					"Lỗi khi lưu thông tin video hoặc cập nhật project: " + e.getMessage());
		}
	}

}
