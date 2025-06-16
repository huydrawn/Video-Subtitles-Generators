package com.example.video.editor.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.example.video.editor.model.*;
import com.example.video.editor.repository.RoleRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.video.editor.dto.UserDTO;
import com.example.video.editor.dto.UserRegistrationRequest;
import com.example.video.editor.dto.WorkspaceDto;
import com.example.video.editor.exception.AlreadyExistsException;
import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.mapstruct.UserMapper;
import com.example.video.editor.mapstruct.WorkspaceMapper;
import com.example.video.editor.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder; // Inject PasswordEncoder
	private final WorkspaceMapper workspaceMapper;
	private final UserMapper userMapper;
	private final RoleRepository roleRepository;
	private static final String DEFAULT_USER_ROLE_NAME = "USER";
	private static final String ADMIN_ROLE_NAME = "ADMIN"; // Define admin role name
	private static final int ADMIN_ROLE_ID = 1;
	public static final int MAX_FAILED_ATTEMPTS = 4;
	public static final Duration BLOCK_DURATION = Duration.ofMinutes(1);

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

		Role defaultRole = roleRepository.findByRoleName(DEFAULT_USER_ROLE_NAME)
				.orElseThrow(() -> new IllegalStateException("Default role '" + DEFAULT_USER_ROLE_NAME + "' not found in database. Please ensure it exists."));

		User user = User.builder()
				.username(registrationRequest.getUsername())
				.email(registrationRequest.getEmail())
				.passwordHash(passwordEncoder.encode(registrationRequest.getPassword()))
				.status(UserStatus.ACTIVE)
				.accountTier(AccountTier.FREE)
				.role(defaultRole) // THÊM: Gán vai trò mặc định
				.createdAt(LocalDateTime.now())
				.updatedAt(LocalDateTime.now())
				.build();
		return userRepository.save(user);
	}

	@Transactional
	public WorkspaceDto createWorkspaceForUser(Long userId, String workspaceName, String description)
			throws NotFoundException {
		User user = findById(userId);
		Workspace newWorkspace = Workspace.builder().workspaceName(workspaceName).description(description)
				.createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).user(user) // Thiết lập mối quan hệ ngược
																							// lại
				.build();

		user.setWorkspace(newWorkspace);
		userRepository.save(user);
		return workspaceMapper.toDto(user.getWorkspace());
	}

	@Override
	public UserDTO getUserInfo(Long userId) throws NotFoundException {
		var user = findById(userId);
		return userMapper.toDto(user);
	}

	private User findById(long userId) throws NotFoundException {
		return userRepository.findById(userId)
				.orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng với ID: " + userId));
	}

	@Cacheable(value = "userStorageCache", key = "#userId")
	public Long calculateUsedStorage(Long userId) {
		System.out.println("getDb");
		return userRepository.getUsedStorageByUserId(userId);
	}
    @Override
    @Transactional // Chỉ đọc dữ liệu
    public List<UserDTO> getAllUsers() {
        List<User> users = userRepository.findAll();
        return users.stream()
                .map(userMapper::toDto) // Sử dụng UserMapper để ánh xạ
                .collect(Collectors.toList());
    }
	@Override
	@Transactional
	public UserDTO banUser(Long userIdToBan, Long adminId) throws NotFoundException, AccessDeniedException {
		// 1. Verify the caller is an admin
		if (!isAdmin(adminId)) {
			throw new AccessDeniedException("Only administrators can ban users.");
		}

		// 2. Find the user to be banned
		User userToBan = findById(userIdToBan);

		// Optional: Prevent banning an admin account (if that's a rule)
		if (userToBan.getRole() != null && userToBan.getRole().getRoleId() == ADMIN_ROLE_ID) {
			throw new AccessDeniedException("Cannot ban an administrator account.");
		}

		// 3. Update status
		userToBan.setStatus(UserStatus.BLOCKED);
		userToBan.setUpdatedAt(LocalDateTime.now()); // Update timestamp
		userRepository.save(userToBan);

		// 4. Return DTO of the updated user
		return userMapper.toDto(userToBan);
	}

	@Override
	@Transactional
	public UserDTO unbanUser(Long userIdToUnban, Long adminId) throws NotFoundException, AccessDeniedException {
		// 1. Verify the caller is an admin
		if (!isAdmin(adminId)) {
			throw new AccessDeniedException("Only administrators can unban users.");
		}

		// 2. Find the user to be unbanned
		User userToUnban = findById(userIdToUnban);

		// 3. Update status (e.g., to ACTIVE)
		userToUnban.setStatus(UserStatus.ACTIVE);
		userToUnban.setUpdatedAt(LocalDateTime.now()); // Update timestamp
		userRepository.save(userToUnban);

		// 4. Return DTO of the updated user
		return userMapper.toDto(userToUnban);
	}

	// Helper method (already present and used)
	private boolean isAdmin(Long userId) throws NotFoundException {
		User user = findById(userId);
		// Check by role ID or role name, depending on your preference and data setup
		// Using role ID (e.g., 1 for ADMIN)
		return user.getRole() != null && user.getRole().getRoleId() == ADMIN_ROLE_ID;
		// Or using role name:
		// return user.getRole() != null && user.getRole().getName().equalsIgnoreCase(ADMIN_ROLE_NAME);
	}
	@Override
	public Optional<User> findUserByEmail(String email) {
		return userRepository.findByEmail(email);
	}
	@Override
	public boolean isAccountLocked(User user) {
		return user.getFailedLoginAttempts() >= MAX_FAILED_ATTEMPTS && user.getStatus() == UserStatus.PENDING;
	}
	@Override
	@Transactional
	public void incrementFailedAttempts(User user) {
		int attempts = user.getFailedLoginAttempts() + 1;
		user.setFailedLoginAttempts(attempts);
		if (attempts == MAX_FAILED_ATTEMPTS) {
			user.setLastFailedLoginTime(LocalDateTime.now()); // Set lock time
			user.setStatus(UserStatus.PENDING); // Set status to PENDING when locked
			System.out.println("User " + user.getUsername() + " locked. Status set to PENDING.");
		}
		userRepository.save(user);
	}

	@Override
	@Transactional
	public void resetFailedAttempts(User user) {
		user.setFailedLoginAttempts(0);
		user.setLastFailedLoginTime(null);
		if (user.getStatus() == UserStatus.PENDING) {
			user.setStatus(UserStatus.ACTIVE); // Reset status to ACTIVE if it was PENDING
			System.out.println("User " + user.getUsername() + " unlocked. Status set to ACTIVE.");
		}
		userRepository.save(user);
	}

	@Override
	@Scheduled(fixedRate = 60000) // 60,000 milliseconds = 1 minute
	@Transactional
	public void unlockAccountsPeriodically() {
		System.out.println("Running scheduled task to unlock accounts...");
		userRepository.findAll().forEach(user -> {
			// Only process users that are currently PENDING due to lockout
			if (user.getStatus() == UserStatus.PENDING && user.getFailedLoginAttempts() > 0 && user.getLastFailedLoginTime() != null) {
				LocalDateTime blockEndTime = user.getLastFailedLoginTime().plus(BLOCK_DURATION);
				if (LocalDateTime.now().isAfter(blockEndTime)) {
					// Block duration expired, reset attempts and unlock
					resetFailedAttempts(user); // This will set status back to ACTIVE
					System.out.println("User " + user.getUsername() + " (ID: " + user.getUserId() + ") unlocked automatically. Status is now ACTIVE.");
				}
			}
		});
		System.out.println("Scheduled task finished.");
	}

	@Override
	@Transactional
	public void updateAccountTier(Long userId, AccountTier newTier) throws NotFoundException {
		User user = findById(userId);
		user.setAccountTier(newTier);
		userRepository.save(user);
	}



}