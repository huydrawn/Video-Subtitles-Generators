package com.example.video.editor.service.autoSub;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.concurrent.*;

import org.json.JSONObject;
import org.springframework.core.io.ClassPathResource;

public class SubtitleService {
    private static final String BASE_PATH = "/python";
    private static final String PYTHON_PATH = "python"; // hoặc "python"
    private static final String PYTHON_NAME_FILE = "/autoSub.py";
    private static final long TIMEOUT_SECONDS = 60; // Thời gian chờ tối đa cho script Python

    public static String generateSubtitleFromVideo(String videoUrl, String modelName) throws Exception {
        // Lấy đường dẫn thực tế đến generate_srt.py từ resources
        File scriptFile = new ClassPathResource(BASE_PATH + PYTHON_NAME_FILE).getFile();
        String scriptPath = scriptFile.getAbsolutePath();

        // Lấy đường dẫn thực tế đến vosk model từ resources
        File modelFolder = new ClassPathResource(BASE_PATH + modelName).getFile();
        String modelPath = modelFolder.getAbsolutePath();
        
        ProcessBuilder pb = new ProcessBuilder(PYTHON_PATH, scriptPath, videoUrl, modelPath);
        System.out.printf("%s %s %s %s \n",PYTHON_PATH, scriptPath, videoUrl, modelPath);
        pb.redirectErrorStream(true); // Gộp stdout và stderr

        // Tạo một Process để chạy Python script và đọc output
        Process process = pb.start();

        // Thiết lập ExecutorService để kiểm soát thời gian chờ
        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<String> future = executor.submit(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                StringBuilder output = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line);
                }
                // Parse JSON từ output của Python
                JSONObject jsonResponse = new JSONObject(output.toString());
                return jsonResponse.getString("subtitle");  // Lấy kết quả phụ đề từ JSON
            }
        });

        try {
            // Chờ kết quả trong một khoảng thời gian cho phép
            return future.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            process.destroy();  // Hủy process nếu hết thời gian
            throw new RuntimeException("Python script timed out after " + TIMEOUT_SECONDS + " seconds");
        } catch (InterruptedException | ExecutionException e) {
            process.destroy();
            throw new RuntimeException("Error while executing Python script: " + e.getMessage(), e);
        } finally {
            executor.shutdownNow(); // Dừng ExecutorService
            process.waitFor(); // Đảm bảo process được hoàn thành trước khi thoát
        }
    }
}