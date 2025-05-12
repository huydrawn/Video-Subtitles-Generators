package com.example.video.editor.service;

import java.time.LocalDateTime;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.video.editor.dto.UserRegistrationRequest;
import com.example.video.editor.exception.AlreadyExistsException;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.User;
import com.example.video.editor.model.UserStatus;
import com.example.video.editor.model.Workspace;
import com.example.video.editor.repository.UserRepository;

import jakarta.transaction.Transactional;
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

	@Transactional
    public User createWorkspaceForUser(Long userId, String workspaceName, String description) throws NotFoundException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng với ID: " + userId));

        Workspace newWorkspace = Workspace.builder()
                .workspaceName(workspaceName)
                .description(description)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .user(user) // Thiết lập mối quan hệ ngược lại
                .build();

        user.setWorkspace(newWorkspace);
        return userRepository.save(user);
    }

}