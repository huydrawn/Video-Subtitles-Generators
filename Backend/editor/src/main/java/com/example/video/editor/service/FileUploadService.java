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
		byte[] fileBytes = (byte[]) params[0];
		String originName = (String) params[1];
		String publicProjectId = (String) params[2];

		progressCallback.accept(0, "Bắt đầu xử lý video");

		Project project = null;
		Video video = null;
		try {

			project = projectRepository.findByPublicId(publicProjectId)
					.orElseThrow(() -> new NotFoundException("Không tìm thấy Project với ID: " + publicProjectId));
			progressCallback.accept(10, "Đã tìm thấy Project");

			// Tải video lên Cloudinary
			video = videoService.uploadVideoToCloudinary(fileBytes, originName);

			progressCallback.accept(70, "Tải video lên Cloudinary thành công");
			videoRepository.save(video);
			progressCallback.accept(90, "Lưu thông tin video vào database thành công");
			completeCallback.accept(video, "Xử lý video hoàn tất");

			// Liên kết video với project
			project.setVideo(video);
			projectRepository.save(project); // Gọi ProjectService để save project

		} catch (NotFoundException e) {
			errorCallback.accept("PROJECT_NOT_FOUND", e.getMessage());
			throw e;
		} catch (IOException e) {
			errorCallback.accept("CLOUDINARY_UPLOAD_FAILED", "Lỗi khi tải video lên Cloudinary: " + e.getMessage());
			throw e;
		} catch (Exception e) {
			errorCallback.accept("DATABASE_ERROR",
					"Lỗi khi lưu thông tin video hoặc cập nhật project: " + e.getMessage());
			throw e;
		}
	}

}
