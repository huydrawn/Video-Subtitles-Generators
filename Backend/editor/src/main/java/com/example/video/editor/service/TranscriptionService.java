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

import com.example.video.editor.client.PythonTranscriptionClient;
import com.example.video.editor.dto.TranscriptionRequest;
import com.example.video.editor.dto.TranscriptionResponse;
import com.example.video.editor.model.SrtSegment;
import com.example.video.editor.service.progess.ProgressTask;

@Service
public class TranscriptionService extends ProgressTask {

	@Autowired
	private PythonTranscriptionClient pythonTranscriptionClient;

	@Override
	protected void executeTask(BiConsumer<Integer, String> progressCallback,
			BiConsumer<Object, String> completeCallback, BiConsumer<String, String> errorCallback, Object... params)
			throws Exception {

		try {
			// Bước 1: Khởi động task
			progressCallback.accept(0, "Khởi tạo");

			// Lấy tham số từ params
			TranscriptionRequest request = (TranscriptionRequest) params[0];

			progressCallback.accept(5, "Chuẩn bị gửi yêu cầu đến Python API");

			TranscriptionResponse transcriptionResponse = pythonTranscriptionClient.transcribe(request);

			progressCallback.accept(15, "Đang gửi yêu cầu transcribe");

			progressCallback.accept(60, "Nhận phản hồi thành công");

			// Bước 3: Lấy nội dung phụ đề SRT
			List<SrtSegment> srtContent = transcriptionResponse.getSrt();

			if (srtContent == null || srtContent.isEmpty()) {
				errorCallback.accept("SUB_EMPTY", "Phụ đề rỗng hoặc không hợp lệ.");
				return;
			}

			// (Giả sử có thể lưu file, convert sang .ass và render video ở đây)
			progressCallback.accept(75, "Xử lý phụ đề");

			// TODO: Convert srtContent sang .ass (gọi script hoặc API phụ nếu có)
			// TODO: Render phụ đề vào video bằng FFmpeg nếu cần

			// Bước 4: Hoàn tất
			progressCallback.accept(100, "Hoàn tất");

			// Gọi callback hoàn tất với phụ đề dạng SRT hoặc đường dẫn video sau render
			completeCallback.accept(srtContent, "success");

		} catch (Exception e) {
			errorCallback.accept("SYSTEM_ERROR", "Đã xảy ra lỗi: " + e.getMessage());
		}
	}
}