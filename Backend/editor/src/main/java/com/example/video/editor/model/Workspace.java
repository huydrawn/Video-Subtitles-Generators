package com.example.video.editor.model;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workspaces")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Workspace {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "workspace_id")
	private Long workspaceId;

	@Column(name = "public_id", unique = true, nullable = false, length = 36)
	private String publicId;

	@ManyToOne
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(name = "workspace_name", nullable = false, length = 100)
	private String workspaceName;

	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt = LocalDateTime.now();

	@Column(name = "updated_at")
	private LocalDateTime updatedAt = LocalDateTime.now();

	@Column(name = "description", columnDefinition = "TEXT")
	private String description;

	@OneToMany(mappedBy = "workspace", cascade = CascadeType.ALL, orphanRemoval = true)
	private Set<Project> projects = new HashSet<>();

	@PrePersist
	public void generatePublicId() {
		if (this.publicId == null) {
			this.publicId = UUID.randomUUID().toString();
		}
	}
}