package com.example.video.editor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
<<<<<<< HEAD
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
=======
import org.springframework.context.annotation.ComponentScan;
>>>>>>> 45a0f4b650dd0d08542a3f8c7487b5bcb2d3823f
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

@SpringBootApplication
@EnableWebSecurity
@EnableCaching
<<<<<<< HEAD
@EnableFeignClients(basePackages = "com.example.video.editor.client")
@EnableJpaAuditing
=======

>>>>>>> 45a0f4b650dd0d08542a3f8c7487b5bcb2d3823f
public class EditorApplication {

	public static void main(String[] args) {
		SpringApplication.run(EditorApplication.class, args);
	}

}
