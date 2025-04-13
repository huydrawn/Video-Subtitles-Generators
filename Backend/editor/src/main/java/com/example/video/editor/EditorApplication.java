package com.example.video.editor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

@SpringBootApplication
@EnableWebSecurity
public class EditorApplication {

	public static void main(String[] args) {
		SpringApplication.run(EditorApplication.class, args);
	}

}
