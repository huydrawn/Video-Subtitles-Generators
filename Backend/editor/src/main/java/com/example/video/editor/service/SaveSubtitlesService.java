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
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
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
        // Sử dụng .toPath() và Files.createTempFile để đảm bảo tạo file an toàn
        Path outputVideoPath = Files.createTempFile("video-with-subtitle-", ".mp4");
        File outputVideo = outputVideoPath.toFile();

        // Xử lý đường dẫn cho FFmpeg trên Windows:
        // Cần thay thế '\' thành '/' và thoát dấu ':' cho đường dẫn ổ đĩa trong bộ lọc ASS
        String subtitlePath = subtitleFile.getAbsolutePath();
        String escapedSubtitlePathForFfmpegFilter = subtitlePath.replace("\\", "/");
        escapedSubtitlePathForFfmpegFilter = escapedSubtitlePathForFfmpegFilter.replace(":", "\\:");

        String videoPath = videoFile.getAbsolutePath();
        String outputPath = outputVideo.getAbsolutePath();

        // THAY ĐỔI LỚN TẠI ĐÂY: MỞ RỘNG CÁC ĐỐI SỐ CỦA ProcessBuilder
        ProcessBuilder pb = new ProcessBuilder(
                "ffmpeg",
                "-y", // Tự động ghi đè file output nếu tồn tại
                "-i", videoPath,
                "-vf", "ass=\'" + escapedSubtitlePathForFfmpegFilter + "\'",
                // Cấu hình mã hóa video (libx264 - H.264)
                "-c:v", "libx264",
                "-crf", "23",
                "-preset", "medium",
                // Các tham số tương thích bổ sung cho H.264
                "-pix_fmt", "yuv420p",
                "-profile:v", "main",
                "-level", "4.0",
                "-movflags", "+faststart",
                // Cấu hình mã hóa âm thanh (AAC) - thay thế "copy"
                "-c:a", "aac",
                "-b:a", "128k",
                outputPath
        );
        // KẾT THÚC THAY ĐỔI LỚN

        // Debug: Log the FFmpeg command
        System.out.println("Executing FFmpeg command: " + String.join(" ", pb.command()));

        Map<String, String> env = pb.environment();
        env.put("PYTHONIOENCODING", "utf-8");
        pb.redirectErrorStream(true);

        Process process = pb.start();

        // Đọc log ffmpeg (để debug)
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("FFmpeg Output: " + line);
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            String errorOutput = readProcessOutput(process.getErrorStream());
            throw new RuntimeException("FFmpeg process failed with exit code " + exitCode + ". Error: " + errorOutput);
        }

        return outputVideo;
    }

    private String readProcessOutput(InputStream inputStream) throws IOException {
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }
        return output.toString();
    }

    private File loadFileFromCloudinaryVideoUrl(String videoUrl) throws IOException {
        URL url = new URL(videoUrl);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(10000); // optional timeout
        connection.setReadTimeout(10000);

        // Tạo file tạm để lưu video
        Path tempFilePath = Files.createTempFile("video-", ".mp4");
        File tempFile = tempFilePath.toFile();

        try (InputStream inputStream = connection.getInputStream();
             FileOutputStream outputStream = new FileOutputStream(tempFile)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead); // ĐÃ SỬA LỖI IndexOutOfBoundsException Ở ĐÂY TRƯỚC ĐÓ
            }
        }

        connection.disconnect();

        return tempFile;
    }

    @Override
    protected void executeTask(BiConsumer<Integer, String> progressCallback,
                               BiConsumer<Object, String> completeCallback, BiConsumer<String, String> errorCallback, Object... params)
            throws Exception {
        File videoFile = null;
        File tempAssFile = null;
        File subbedFile = null;

        try {
            // Bước 0: Nhận dữ liệu và xác thực
            progressCallback.accept(0, "Bắt đầu xử lý...");
            byte[] fileSub = (byte[]) params[0];
            String projectPublicId = (String) params[1];

            progressCallback.accept(10, "Đang tìm project...");
            Project project = projectRepository.findByPublicId(projectPublicId)
                    .orElseThrow(() -> new NotFoundException(projectPublicId));

            Video video = project.getVideo();
            String urlVideo = video.getUrl();

            // Bước 1: Tải video từ Cloudinary
            progressCallback.accept(30, "Đang tải video từ Cloudinary...");
            videoFile = loadFileFromCloudinaryVideoUrl(urlVideo);

            // Bước 2: Ghi phụ đề vào file tạm thời
            progressCallback.accept(50, "Đang ghi phụ đề...");
            tempAssFile = Files.createTempFile("subtitle-", ".ass").toFile();
            Files.write(tempAssFile.toPath(), fileSub);

            // Bước 3: Gắn phụ đề vào video
            progressCallback.accept(70, "Đang gắn phụ đề vào video...");
            subbedFile = addSubtitleToVideo(videoFile, tempAssFile);

            // Bước 4: Upload video mới lên Cloudinary
            progressCallback.accept(90, "Đang upload video mới...");
            Video newVideo = videoService.uploadVideoToCloudinary(Files.readAllBytes(subbedFile.toPath()),
                    subbedFile.getName());

            // <--- THÊM VÀO ĐÂY: In ra đường dẫn video mới
            System.out.println("Video processed and uploaded to Cloudinary: " + newVideo.getUrl());

            // Bước 5: Cập nhật lại project
            project.setVideo(newVideo);
            projectRepository.save(project);

            // Hoàn tất
            progressCallback.accept(100, "Hoàn tất");
            completeCallback.accept(newVideo.getUrl(), "Hoàn tất upload video");

        } catch (Exception e) {
            errorCallback.accept("Lỗi khi xử lý video", e.getMessage());
            System.err.println("Error in SaveSubtitlesService: " + e.getMessage());
            e.printStackTrace();
            throw e;
        } finally {
            // Khối finally để dọn dẹp các file tạm thời
            if (videoFile != null && videoFile.exists()) {
                try {
                    Files.deleteIfExists(videoFile.toPath());
                    System.out.println("Cleaned up: " + videoFile.getAbsolutePath());
                } catch (IOException e) {
                    System.err.println("Error cleaning up videoFile: " + videoFile.getAbsolutePath() + " - " + e.getMessage());
                }
            }
            if (tempAssFile != null && tempAssFile.exists()) {
                try {
                    Files.deleteIfExists(tempAssFile.toPath());
                    System.out.println("Cleaned up: " + tempAssFile.getAbsolutePath());
                } catch (IOException e) {
                    System.err.println("Error cleaning up tempAssFile: " + tempAssFile.getAbsolutePath() + " - " + e.getMessage());
                }
            }
            if (subbedFile != null && subbedFile.exists()) {
                try {
                    Files.deleteIfExists(subbedFile.toPath());
                    System.out.println("Cleaned up: " + subbedFile.getAbsolutePath());
                } catch (IOException e) {
                    System.err.println("Error cleaning up subbedFile: " + subbedFile.getAbsolutePath() + " - " + e.getMessage());
                }
            }
        }
    }

}