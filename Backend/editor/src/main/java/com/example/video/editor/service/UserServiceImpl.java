package com.example.video.editor.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.video.editor.dto.UserRegistrationRequest;
import com.example.video.editor.exception.AlreadyExistsException;
import com.example.video.editor.model.User;
import com.example.video.editor.model.UserStatus;
import com.example.video.editor.repository.UserRepository;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder; // Inject PasswordEncoder

	@Override
	public User saveUser(User user) {
		// Logic nghiệp vụ trước khi lưu (nếu có)
		return userRepository.save(user);
	}

	@Override
	public User registerNewUserAccount(UserRegistrationRequest registrationRequest) {
		if (userRepository.findByUsername(registrationRequest.getUsername()).isPresent()) {
			throw new AlreadyExistsException("Username already exists");
		}
		if (userRepository.findByEmail(registrationRequest.getEmail()).isPresent()) {
			throw new AlreadyExistsException("Email already exists");
		}
		User user = new User();
		user.setUsername(registrationRequest.getUsername());
		user.setEmail(registrationRequest.getEmail());
		user.setPasswordHash(passwordEncoder.encode(registrationRequest.getPassword()));
		user.setStatus(UserStatus.PENDING); // Hoặc trạng thái mặc định
		return userRepository.save(user);
	}
}