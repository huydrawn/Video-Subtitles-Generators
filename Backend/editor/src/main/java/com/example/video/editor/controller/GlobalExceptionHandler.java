package com.example.video.editor.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;

import com.example.video.editor.exception.AlreadyExistsException;
import com.example.video.editor.exception.InvalidJwtTokenException;
import com.example.video.editor.exception.NotFoundException;

import jakarta.servlet.http.HttpServletRequest;

@ControllerAdvice
public class GlobalExceptionHandler {
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<?> handleValidationException(MethodArgumentNotValidException ex, Locale locale) {
		List<String> errors = ex.getBindingResult().getFieldErrors().stream().map(error -> error.getDefaultMessage())
				.toList();
		return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
	}

	@ExceptionHandler(InvalidJwtTokenException.class)
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	public Map<String, Object> handleInvalidJwtToken(InvalidJwtTokenException ex, HttpServletRequest request) {
		return Map.of("error", ex.getMessage(), "status", HttpStatus.UNAUTHORIZED.value(), "timestamp",
				LocalDateTime.now().toString(), "path", request.getRequestURI());
	}

	@ExceptionHandler(NoHandlerFoundException.class)
	@ResponseStatus(HttpStatus.NOT_FOUND)
	public Map<String, Object> handleNoHandlerFoundException(NoHandlerFoundException ex) {
		Map<String, Object> error = new HashMap<>();
		error.put("error", "Endpoint not found");
		error.put("path", ex.getRequestURL());
		error.put("timestamp", LocalDateTime.now());
		return error;
	}

	@ExceptionHandler(NotFoundException.class)
	public ResponseEntity<Object> handleNotFoundException(NotFoundException ex, WebRequest request) {
		Map<String, Object> body = new HashMap<>();
		body.put("timestamp", LocalDateTime.now());
		body.put("status", HttpStatus.NOT_FOUND.value());
		body.put("error", "Not Found");
		body.put("message", ex.getMessage());
		body.put("path", ((ServletWebRequest) request).getRequest().getRequestURI());

		return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
	}

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
