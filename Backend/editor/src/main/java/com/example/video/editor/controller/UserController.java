package com.example.video.editor.controller;

import com.example.video.editor.model.AccountTier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import com.example.video.editor.dto.UserDTO;
import com.example.video.editor.dto.WorkspaceCreationRequest;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.SecurityUser;
import com.example.video.editor.model.User;
import com.example.video.editor.service.UserService;

import lombok.RequiredArgsConstructor;

import java.util.List;

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
	@GetMapping("/list")
	public ResponseEntity<List<UserDTO>> getAllUsers(@AuthenticationPrincipal SecurityUser securityUser) {
		List<UserDTO> users = userService.getAllUsers();
		return new ResponseEntity<>(users, HttpStatus.OK);
	}
	@PutMapping("/ban")
	public ResponseEntity<?> banUser(@RequestParam Long userId, @AuthenticationPrincipal SecurityUser securityUser) {
		try {
			UserDTO updatedUser = userService.banUser(userId, securityUser.getUserId());
			return new ResponseEntity<>(updatedUser, HttpStatus.OK);
		} catch (NotFoundException e) {
			return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND); // 404 Not Found
		} catch (AccessDeniedException e) {
			return new ResponseEntity<>(e.getMessage(), HttpStatus.FORBIDDEN); // 403 Forbidden
		} catch (Exception e) {
			// Catch any other unexpected exceptions
			return new ResponseEntity<>("An unexpected error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR); // 500 Internal Server Error
		}
	}

	// New API to unban a user (only for admins)
	@PutMapping("/unban")
	public ResponseEntity<?> unbanUser(@RequestParam Long userId, @AuthenticationPrincipal SecurityUser securityUser) {
		try {
			UserDTO updatedUser = userService.unbanUser(userId, securityUser.getUserId());
			return new ResponseEntity<>(updatedUser, HttpStatus.OK);
		} catch (NotFoundException e) {
			return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND); // 404 Not Found
		} catch (AccessDeniedException e) {
			return new ResponseEntity<>(e.getMessage(), HttpStatus.FORBIDDEN); // 403 Forbidden
		} catch (Exception e) {
			// Catch any other unexpected exceptions
			return new ResponseEntity<>("An unexpected error occurred: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR); // 500 Internal Server Error
		}
	}
	@PutMapping("/account-tier")
	public ResponseEntity<?> updateAccountTier(
			@AuthenticationPrincipal SecurityUser securityUser,
			@RequestParam("tier") AccountTier newTier) throws NotFoundException {
		userService.updateAccountTier(securityUser.getUserId(), newTier);

		return new ResponseEntity<>(newTier.name(), HttpStatus.OK);
	}


}