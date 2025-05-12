package com.example.video.editor.service;

import com.example.video.editor.dto.UserRegistrationRequest;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.User;

public interface UserService {
    User saveUser(User user);

	User registerNewUserAccount(UserRegistrationRequest registrationRequest);

	User createWorkspaceForUser(Long userId, String workspaceName, String description) throws NotFoundException;
}