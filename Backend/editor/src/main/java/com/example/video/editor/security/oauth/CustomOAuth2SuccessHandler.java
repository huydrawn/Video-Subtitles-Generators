package com.example.video.editor.security.oauth;

import java.io.IOException;
import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.example.video.editor.model.User;
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
		System.out.println(request.getContextPath());
		OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
		OAuth2User user = oauthToken.getPrincipal();

		String email = user.getAttribute("email");
		String name = user.getAttribute("name");
		
		// Lưu user nếu lần đầu
		User dbUser = userRepository.findByEmail(email).orElseGet(() -> {
			return userRepository.save(User.builder().email(email).build());
		});

		// Tạo JWT
		String jwt = jwtService.generateToken(dbUser.getEmail());
		System.out.println(jwt);
		// Trả JWT về frontend (redirect với JWT hoặc trả JSON)
		String redirectUrl = "http://localhost:3000/oauth2/success?token=" + "123";
		response.sendRedirect(redirectUrl);
	}

}