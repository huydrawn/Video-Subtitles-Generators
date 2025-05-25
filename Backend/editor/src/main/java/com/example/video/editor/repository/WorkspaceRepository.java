package com.example.video.editor.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.video.editor.model.Workspace;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
	@Query("SELECT COUNT(w) > 0 FROM Workspace w WHERE w.publicId = :workspacePublicId AND w.user.id = :userId")
	boolean hasPermission(@Param("userId") Long userId, @Param("workspacePublicId") String workspacePublicId);

	Optional<Workspace> findByPublicId(String publicId);
}
