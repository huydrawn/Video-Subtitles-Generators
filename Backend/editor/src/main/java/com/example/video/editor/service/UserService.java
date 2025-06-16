package com.example.video.editor.service;

import com.example.video.editor.dto.UserDTO;
import com.example.video.editor.dto.UserRegistrationRequest;
import com.example.video.editor.dto.WorkspaceDto;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.AccountTier;
import com.example.video.editor.model.User;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

public interface UserService {
	User saveUser(User user);

	User registerNewUserAccount(UserRegistrationRequest registrationRequest);

	WorkspaceDto createWorkspaceForUser(Long userId, String workspaceName, String description) throws NotFoundException;

	UserDTO getUserInfo(Long userId) throws NotFoundException;

	public Long calculateUsedStorage(Long userId);
	List<UserDTO> getAllUsers(); // Phương thức mới
	UserDTO banUser(Long userIdToBan, Long adminId) throws NotFoundException, AccessDeniedException;
	UserDTO unbanUser(Long userIdToUnban, Long adminId) throws NotFoundException, AccessDeniedException;

	Optional<User> findUserByEmail(String email); // Để AuthenticationService có thể tìm user
	boolean isAccountLocked(User user);
	void incrementFailedAttempts(User user);
	void resetFailedAttempts(User user);
	void unlockAccountsPeriodically(); //

	void updateAccountTier(Long userId, AccountTier newTier) throws NotFoundException;

}