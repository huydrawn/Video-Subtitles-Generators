package com.example.video.editor.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.example.video.editor.exception.AlreadyExistsException;

@ControllerAdvice
public class GlobalExceptionHandler {
	@ExceptionHandler(AlreadyExistsException.class)
	public ResponseEntity<Object> handleGenericAlreadyExistsException(AlreadyExistsException ex, WebRequest request) {
		Map<String, Object> body = new HashMap<>();
		body.put("timestamp", LocalDateTime.now());
		body.put("message", ex.getMessage());
		body.put("status", HttpStatus.CONFLICT.value()); // 409 Conflict

		return new ResponseEntity<>(body, HttpStatus.CONFLICT);
	}

	// Xử lý tất cả lỗi chung chung
	@ExceptionHandler(Exception.class)
	public ResponseEntity<String> handleException(Exception ex) {
		return new ResponseEntity<>("Server Error: " + ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
	}

	// Xử lý lỗi khi file upload quá dung lượng
	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<String> handleMaxSizeException(MaxUploadSizeExceededException ex) {
		return new ResponseEntity<>("File size too large!", HttpStatus.PAYLOAD_TOO_LARGE);
	}
}
