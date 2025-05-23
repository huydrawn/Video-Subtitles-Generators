package com.example.video.editor.service.progess;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TaskProcessingService {

	private final SimpMessagingTemplate messagingTemplate;
	private final ExecutorService taskExecutor = Executors.newCachedThreadPool();

	public String startProgressTask(ProgressTask task, Object... params) {
		String taskId = UUID.randomUUID().toString();
		taskExecutor.submit(() -> {
			try {
				task.executeTask((progress, message) -> sendProgress(taskId, progress, message),
						(result, message) -> sendComplete(taskId, result, message),
						(error, message) -> sendError(taskId, error, message), params);
			} catch (Exception e) {
				sendError(taskId, "Task execution failed: " + e.getMessage(), null);
				e.printStackTrace();
			}
		});
		return taskId;
	}

	private void sendProgress(String taskId, int progress, String message) {
		messagingTemplate.convertAndSend("/topic/progress/" + taskId,
				Map.of("progress", progress, "message", message == null ? "" : message));
	}

	private void sendComplete(String taskId, Object result, String message) {
		messagingTemplate.convertAndSend("/topic/progress/" + taskId,
				Map.of("status", "complete", "result", result, "message", message == null ? "" : message));
	}

	private void sendError(String taskId, Object error, String message) {
		messagingTemplate.convertAndSend("/topic/progress/" + taskId, Map.of("status", "error", "error",
				error == null ? "" : error.toString(), "message", message == null ? "" : message));
	}

	public SimpMessagingTemplate getMessagingTemplate() {
		return messagingTemplate;
	}
}