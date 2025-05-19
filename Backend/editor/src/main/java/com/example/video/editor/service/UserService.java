package com.example.video.editor.service;

import com.example.video.editor.dto.UserDTO;
import com.example.video.editor.dto.UserRegistrationRequest;
import com.example.video.editor.dto.WorkspaceDto;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.User;

public interface UserService {
	User saveUser(User user);

	User registerNewUserAccount(UserRegistrationRequest registrationRequest);

	WorkspaceDto createWorkspaceForUser(Long userId, String workspaceName, String description) throws NotFoundException;

	UserDTO getUserInfo(Long userId) throws NotFoundException;

	public Long calculateUsedStorage(Long userId);

}