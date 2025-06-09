package com.example.video.editor.config.constant;

import java.util.List;

public class SecurityConstants {

	public static final List<String> PUBLIC_URLS = List.of("/api/payments/**","/api/webhook/**", "/test/**", "/api/subtitles/**",
			"/api/public/**", "/oauth2/**", "/sub/**", "/topic/progress/**", "/ws/**", "/swagger-ui.html",
			"/swagger-ui/**", "/v3/api-docs", "/v3/api-docs/**", "/swagger-resources", "/swagger-resources/**",
			"/webjars/**");
}