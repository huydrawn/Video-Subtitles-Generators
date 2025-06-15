package com.example.video.editor.service;

import java.time.Duration; // NEW IMPORT
import java.time.LocalDateTime; // NEW IMPORT
import java.util.HashMap; // NEW IMPORT
import java.util.Map; // NEW IMPORT
import java.util.Optional; // NEW IMPORT

import com.example.video.editor.model.SecurityUser;
import com.example.video.editor.model.User; // NEW IMPORT
import com.example.video.editor.model.UserStatus; // NEW IMPORT
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import com.example.video.editor.dto.AuthenticationResponse; // Keep this import as it's used within the Map
import com.example.video.editor.dto.LoginRequest;
import com.example.video.editor.security.jwt.JwtService;

import lombok.RequiredArgsConstructor;

// Import constants from UserServiceImpl
import static com.example.video.editor.service.UserServiceImpl.MAX_FAILED_ATTEMPTS; // NEW IMPORT
import static com.example.video.editor.service.UserServiceImpl.BLOCK_DURATION; // NEW IMPORT

@Service
@RequiredArgsConstructor
public class AuthenticationService {

	private final AuthenticationManager authenticationManager;
	private final JwtService jwtService;
	private final UserDetailsService userDetailsService;
	private final UserService userService; // Inject UserService to use lockout logic



	public Map<String, Object> authenticate(LoginRequest request) {
		Map<String, Object> response = new HashMap<>(); // Khởi tạo một Map để trả về
		Optional<User> userOptional = userService.findUserByEmail(request.getEmail());

		User user = null;
		if (userOptional.isPresent()) {
			user = userOptional.get();
		}

		// --- PRE-AUTHENTICATION CHECKS ---

		// 1. Check if user exists (to prevent enumeration attack)
		if (user == null) {
			response.put("status", "error");
			response.put("message", "Email hoặc mật khẩu không chính xác.");
			return response; // Trả về Map ở đây
		}

		// 2. Check if user is permanently BLOCKED by an admin
		if (user.getStatus() == UserStatus.BLOCKED) {
			response.put("status", "error");
			response.put("message", "Tài khoản của bạn đã bị khóa vĩnh viễn. Vui lòng liên hệ quản trị viên.");
			return response; // Trả về Map ở đây
		}

		// 3. Check for temporary PENDING (locked) status due to failed attempts
		if (userService.isAccountLocked(user)) {
			// Calculate time remaining for lockout
			Duration timeSinceLastFail = Duration.between(user.getLastFailedLoginTime(), LocalDateTime.now());
			Duration timeLeft = BLOCK_DURATION.minus(timeSinceLastFail);

			if (timeLeft.isNegative() || timeLeft.isZero()) {
				// Lock duration has passed, reset attempts and allow login attempt
				userService.resetFailedAttempts(user);
				System.out.println("Account for " + user.getEmail() + " was unlocked by login attempt. Status reset to ACTIVE.");
			} else {
				// Account is still locked (PENDING)
				response.put("status", "error");
				response.put("message", "Tài khoản tạm thời bị khóa. Vui lòng thử lại sau " + timeLeft.toMinutes() + " phút.");
				return response; // Trả về Map ở đây
			}
		}

		// --- ATTEMPT AUTHENTICATION ---
		try {
			// Perform authentication using Spring Security's AuthenticationManager
			// This will throw BadCredentialsException if password doesn't match
			Authentication authentication = authenticationManager
					.authenticate(new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

			// If authentication is successful:
			if (authentication.isAuthenticated()) {
				// Reset failed attempts for the user
				userService.resetFailedAttempts(user);

				UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
				String jwtToken = jwtService.generateToken(userDetails);
				Long userId = null;
				String userRole = null;

				if (userDetails instanceof SecurityUser) {
					SecurityUser securityUser = (SecurityUser) userDetails;
					userId = securityUser.getUserId();
					userRole = securityUser.getRoleName();
				}

				// Return successful authentication response
				response.put("status", "success");
				response.put("message", "Đăng nhập thành công!");
				response.put("data", AuthenticationResponse.builder() // Vẫn sử dụng AuthenticationResponse để xây dựng phần "data"
						.accessToken(jwtToken)
						.userId(userId)
						.userRole(userRole)
						.build());
				return response; // Trả về Map ở đây
			}
		} catch (BadCredentialsException e) {
			// Password did not match
			// Increment failed attempts and update user status
			userService.incrementFailedAttempts(user);

			// Determine the appropriate error message
			int remainingAttempts = MAX_FAILED_ATTEMPTS - user.getFailedLoginAttempts();
			String errorMessage = "Email hoặc mật khẩu không chính xác.";
			if (remainingAttempts > 0) {
				errorMessage += " Bạn còn lại " + remainingAttempts + " lần thử.";
			} else {
				errorMessage += " Tài khoản của bạn đã bị khóa tạm thời trong " + BLOCK_DURATION.toMinutes() + " phút.";
			}

			response.put("status", "error");
			response.put("message", errorMessage);
			return response; // Trả về Map ở đây
		} catch (AuthenticationException e) {
			// Other authentication exceptions (e.g., DisabledException)
			System.err.println("Authentication failed for user " + request.getEmail() + ": " + e.getMessage());
			response.put("status", "error");
			response.put("message", "Đăng nhập thất bại: " + e.getMessage());
			return response; // Trả về Map ở đây
		}
		// Should ideally not reach here, but as a fallback:
		response.put("status", "error");
		response.put("message", "Đăng nhập không thành công.");
		return response; // Trả về Map ở đây
	}
}