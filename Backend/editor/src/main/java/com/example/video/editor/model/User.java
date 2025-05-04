package com.example.video.editor.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity(name = "t_user")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User {
	@Id 
	@GeneratedValue(strategy = GenerationType.AUTO)
	private int id;
	@Column(name = "username", columnDefinition = "nvarchar(255) UNIQUE")
	private String username;
	@Column(name = "email", unique = true)
	private String email;
	@Column(name = "password")
	private String password;
}
