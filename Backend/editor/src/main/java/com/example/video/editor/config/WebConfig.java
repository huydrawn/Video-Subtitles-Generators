package com.example.video.editor.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Cho tất cả endpoint
                .allowedOrigins("*") // 👈 Cho phép tất cả origin
                .allowedMethods("*") // GET, POST, PUT, DELETE, etc.
                .allowedHeaders("*"); // Cho phép tất cả header
    }
}