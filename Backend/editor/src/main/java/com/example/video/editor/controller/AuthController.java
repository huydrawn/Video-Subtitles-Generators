package com.example.video.editor.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.dto.AuthenticationResponse;
import com.example.video.editor.dto.LoginRequest;
import com.example.video.editor.dto.UserRegistrationRequest;
import com.example.video.editor.model.User;
import com.example.video.editor.service.AuthenticationService;
import com.example.video.editor.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	@Autowired
	private UserService userService;
	@Autowired
	private AuthenticationService authenticationService;

	@PostMapping("/login")
	public ResponseEntity<AuthenticationResponse> authenticateUser(@Valid @RequestBody LoginRequest request) {
		return ResponseEntity.ok(authenticationService.authenticate(request));
	}

	@PostMapping("/register")
	public ResponseEntity<User> registerUser(@Valid @RequestBody UserRegistrationRequest registrationRequest) {
		User registeredUser = userService.registerNewUserAccount(registrationRequest);
		return new ResponseEntity<>(registeredUser, HttpStatus.CREATED);
	}
}