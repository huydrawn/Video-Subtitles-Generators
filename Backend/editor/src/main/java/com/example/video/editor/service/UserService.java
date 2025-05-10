package com.example.video.editor.service;

import com.example.video.editor.dto.UserRegistrationRequest;
import com.example.video.editor.model.User;

public interface UserService {
    User saveUser(User user);

	User registerNewUserAccount(UserRegistrationRequest registrationRequest);
}