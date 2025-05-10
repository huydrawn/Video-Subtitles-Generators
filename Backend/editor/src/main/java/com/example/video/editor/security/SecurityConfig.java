package com.example.video.editor.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.video.editor.security.oauth.CustomOAuth2SuccessHandler;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {
	private final CustomOAuth2SuccessHandler customOAuth2SuccessHandler;

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public SecurityFilterChain configSecurity(HttpSecurity http) throws Exception {
		http.csrf(csrf -> csrf.disable())
				.authorizeHttpRequests(auth -> auth.requestMatchers("/api/public/**", "/oauth2/**", "/sub/**")
						.permitAll().anyRequest().authenticated())
				.oauth2Login(oauth2 -> oauth2.successHandler(customOAuth2SuccessHandler));
		return http.build();
	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowCredentials(true); // ✅ Cho phép gửi cookie/token nếu cần
		config.addAllowedOrigin("*"); // ✅ CHỈ host này được phép
		config.addAllowedHeader("*");
		config.addAllowedMethod("*"); // GET, POST, PUT, DELETE...

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config); // Áp dụng cho toàn bộ path
		return source;
	}
}
