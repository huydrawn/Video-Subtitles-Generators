package com.example.video.editor.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import com.example.video.editor.dto.AuthenticationResponse;
import com.example.video.editor.dto.LoginRequest;
import com.example.video.editor.security.jwt.JwtService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

	private final AuthenticationManager authenticationManager;
	private final JwtService jwtService;
	private final UserDetailsService userDetailsService;

	public AuthenticationResponse authenticate(LoginRequest request) {
		Authentication authentication = authenticationManager
				.authenticate(new UsernamePasswordAuthenticationToken(request.getEmail(), // Sử dụng email
						request.getPassword()));

		if (authentication.isAuthenticated()) {
			UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
			String jwtToken = jwtService.generateToken(userDetails);
			return AuthenticationResponse.builder().accessToken(jwtToken).build();
		}
		return null; // Hoặc ném exception
	}
}