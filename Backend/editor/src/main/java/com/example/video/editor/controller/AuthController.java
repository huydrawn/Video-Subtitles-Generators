package com.example.video.editor.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.dto.LoginRequest;
import com.example.video.editor.dto.UserRegistrationRequest;
import com.example.video.editor.model.User;
import com.example.video.editor.service.AuthenticationService;
import com.example.video.editor.service.UserService;

import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/public/auth")
public class AuthController {
	@Autowired
	private UserService userService;
	@Autowired
	private AuthenticationService authenticationService;

	@PostMapping("/login")
	public ResponseEntity<Map<String, Object>> authenticateUser(@Valid @RequestBody LoginRequest request) {
		// Gọi service để xử lý xác thực và logic khóa tài khoản
		// Không cần cast ở đây vì phương thức authenticationService.authenticate()
		// đã được định nghĩa để trả về Map<String, Object>
		Map<String, Object> response = authenticationService.authenticate(request);

		String status = (String) response.get("status");
		if ("success".equals(status)) {
			// Đối với đăng nhập thành công, trả về 200 OK
			return ResponseEntity.ok(response);
		} else {
			// Đối với lỗi, xác định HttpStatus phù hợp dựa trên thông báo lỗi
			String message = (String) response.get("message");
			// Sử dụng containsIgnoreCase để linh hoạt hơn
			if (message.toLowerCase().contains("khóa vĩnh viễn") || message.toLowerCase().contains("tài khoản tạm thời bị khóa")) {
				return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response); // 403 Forbidden
			} else {
				return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response); // 401 Unauthorized cho thông tin đăng nhập không chính xác
			}
		}
	}

	@PostMapping("/register")
	public ResponseEntity<?> registerUser(@Valid @RequestBody UserRegistrationRequest registrationRequest) {
		User registeredUser = userService.registerNewUserAccount(registrationRequest);
		return new ResponseEntity<>("Register success", HttpStatus.CREATED);
	}
}