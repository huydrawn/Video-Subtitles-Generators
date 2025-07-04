package com.example.video.editor.security.oauth;

import java.io.IOException;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.example.video.editor.model.SecurityUser;
import com.example.video.editor.model.User;
import com.example.video.editor.model.UserStatus;
import com.example.video.editor.repository.UserRepository;
import com.example.video.editor.security.jwt.JwtService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class CustomOAuth2SuccessHandler implements AuthenticationSuccessHandler {

	@Autowired
	private JwtService jwtService;

	@Autowired
	private UserRepository userRepository;

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
			Authentication authentication) throws IOException {
		String redirectUri = (String) request.getSession().getAttribute("redirect_uri");

		OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
		OAuth2User user = oauthToken.getPrincipal();
		String email = user.getAttribute("email");
		String name = user.getAttribute("name");

		// Lưu user nếu lần đầu
		User dbUser = userRepository.findByEmail(email).orElseGet(() -> {
			// Bạn có thể cần thêm các thông tin khác từ OAuth2 user vào đây
			return userRepository.save(User.builder().status(UserStatus.ACTIVE).username(name)
					.createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).email(email).build());
		});

		// Tạo UserDetailsImpl từ User
		SecurityUser userDetails = SecurityUser.build(dbUser);

		// Tạo JWT bằng UserDetails
		String jwt = jwtService.generateToken(userDetails);
		System.out.println(jwt);
		// Trả JWT về frontend (redirect với JWT hoặc trả JSON)
		redirectUri += "?token=" + jwt; // Sử dụng JWT vừa tạo

		response.sendRedirect(redirectUri);
	}
}