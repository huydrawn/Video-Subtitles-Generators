package com.example.video.editor.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)

public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "user_id")
	private Long userId;

	@Column(name = "username", unique = true, nullable = false, length = 50)
	private String username;

	@Column(name = "email", unique = true, nullable = false, length = 100)
	private String email;

	@Column(name = "password_hash", nullable = true)
	private String passwordHash;

	@CreatedDate
	private LocalDateTime createdAt;

	@LastModifiedDate
	private LocalDateTime updatedAt;

	@Enumerated(EnumType.STRING) // Chỉ định cách lưu Enum vào database (dạng chuỗi)
	@Column(name = "status", nullable = false, length = 20)
	private UserStatus status;

	@OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
	@JoinColumn(name = "workspace_id", unique = true) // Khóa ngoại trỏ đến Workspace
	private Workspace workspace;

	@Builder.Default
	@Enumerated(EnumType.STRING)
	@Column(name = "account_tier", nullable = false, length = 20)
	private AccountTier accountTier = AccountTier.FREE;

	@ManyToOne(fetch = FetchType.EAGER) // <--- Đảm bảo FetchType.EAGER là tường minh (mặc định là EAGER cho ManyToOne)
	@JoinColumn(name = "role_id", nullable = false) // <--- Đảm bảo là nullable = false sau khi đã cập nhật DB
	private Role role;

	@Column(name = "failed_login_attempts", nullable = false)
	private int failedLoginAttempts = 0; // Default to 0

	@Column(name = "last_failed_login_time")
	private LocalDateTime lastFailedLoginTime; // To store the timestamp of the last failed login



}