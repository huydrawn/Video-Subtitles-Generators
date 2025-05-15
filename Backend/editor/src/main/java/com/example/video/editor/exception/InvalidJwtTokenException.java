package com.example.video.editor.exception;

import jakarta.servlet.ServletException;

public class InvalidJwtTokenException extends ServletException {
	public InvalidJwtTokenException(String message) {
		super(message);
		// TODO Auto-generated constructor stub
	}
}
