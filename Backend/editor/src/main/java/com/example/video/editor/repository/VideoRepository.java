package com.example.video.editor.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.video.editor.model.Video;

@Repository
public interface VideoRepository extends JpaRepository<Video,Long> {

	Optional<Video> findByCloudinaryPublicId(String publicId);

	void deleteByCloudinaryPublicId(String publicId);

}
