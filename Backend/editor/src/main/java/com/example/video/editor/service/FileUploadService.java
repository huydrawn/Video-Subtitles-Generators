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
		// Lấy tham số từ params
		byte[] fileBytes = (byte[]) params[0];
		String originName = (String) params[1];
		String publicProjectId = (String) params[2];

		progressCallback.accept(0, "Bắt đầu xử lý video");

		Project project = null;
		Video video = null;

		try {
			// Bước 1: Tìm kiếm project
			progressCallback.accept(5, "Đang tìm kiếm Project...");
			project = projectRepository.findByPublicId(publicProjectId)
					.orElseThrow(() -> new NotFoundException("Không tìm thấy Project với ID: " + publicProjectId));
			progressCallback.accept(10, "Đã tìm thấy Project");

			// Bước 2: Tải video lên Cloudinary
			progressCallback.accept(30, "Đang tải video lên Cloudinary...");
			video = videoService.uploadVideoToCloudinary(fileBytes, originName);
			progressCallback.accept(70, "Tải video lên Cloudinary thành công");

			// Bước 3: Lưu video vào database
			progressCallback.accept(80, "Đang lưu thông tin video vào database...");
			videoRepository.save(video);
			progressCallback.accept(90, "Lưu thông tin video vào database thành công");

			// Bước 4: Gắn video vào project và lưu lại
			progressCallback.accept(95, "Đang liên kết video với Project...");
			project.setVideo(video);
			projectRepository.save(project);

			progressCallback.accept(100, "Hoàn tất xử lý video");
			completeCallback.accept(video, "Xử lý video thành công");

		} catch (NotFoundException e) {
			errorCallback.accept("PROJECT_NOT_FOUND", e.getMessage());
			throw e;
		} catch (IOException e) {
			errorCallback.accept("CLOUDINARY_UPLOAD_FAILED", "Lỗi khi tải video lên Cloudinary: " + e.getMessage());
			throw e;
		} catch (Exception e) {
			errorCallback.accept("DATABASE_ERROR", "Lỗi khi lưu video hoặc cập nhật Project: " + e.getMessage());
			throw e;
		}
	}
}
