package com.example.video.editor.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {
	public SecurityFilterChain configSecurity(HttpSecurity http) throws Exception {
		
		return http.build();
	}
	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
	    CorsConfiguration config = new CorsConfiguration();
	    config.setAllowCredentials(true); // ✅ Cho phép gửi cookie/token nếu cần
	    config.addAllowedOrigin("http://localhost:3000"); // ✅ CHỈ host này được phép
	    config.addAllowedHeader("*");
	    config.addAllowedMethod("*"); // GET, POST, PUT, DELETE...

	    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
	    source.registerCorsConfiguration("/**", config); // Áp dụng cho toàn bộ path
	    return source;
	}
}
