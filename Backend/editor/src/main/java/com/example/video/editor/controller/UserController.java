package com.example.video.editor.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.dto.UserDTO;
import com.example.video.editor.dto.WorkspaceCreationRequest;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.SecurityUser;
import com.example.video.editor.model.User;
import com.example.video.editor.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

	private final UserService userService;

	@GetMapping
	public ResponseEntity<?> getUserInfo(@AuthenticationPrincipal SecurityUser securityUser) throws NotFoundException {
		UserDTO dto = userService.getUserInfo(securityUser.getUserId());
		return new ResponseEntity<>(dto, HttpStatus.OK);
	}

	@GetMapping("/storage")
	public ResponseEntity<?> getUserUseStorage(@AuthenticationPrincipal SecurityUser securityUser)
			throws NotFoundException {
		var bytes = userService.calculateUsedStorage(securityUser.getUserId());

		return new ResponseEntity<>(bytes == null ? 0 : bytes, HttpStatus.OK);
	}

	@GetMapping("/workspaces")
	public ResponseEntity<?> getWorkSpaces(@RequestBody WorkspaceCreationRequest request,
			@AuthenticationPrincipal SecurityUser securityUser) throws NotFoundException {

		var dto = userService.createWorkspaceForUser(securityUser.getUserId(), request.getWorkspaceName(),
				request.getDescription());
		return new ResponseEntity<>(dto, HttpStatus.CREATED);
	}

	@PostMapping("/workspace")
	public ResponseEntity<?> createWorkspaceForUser(@RequestBody WorkspaceCreationRequest request,
			@AuthenticationPrincipal SecurityUser securityUser) throws NotFoundException {

		var dto = userService.createWorkspaceForUser(securityUser.getUserId(), request.getWorkspaceName(),
				request.getDescription());
		return new ResponseEntity<>(dto, HttpStatus.CREATED);
	}

}