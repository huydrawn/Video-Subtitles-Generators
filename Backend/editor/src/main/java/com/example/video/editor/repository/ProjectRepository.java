package com.example.video.editor.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.video.editor.model.Project;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
	Optional<Project> findByPublicId(String publicId);

	
}
