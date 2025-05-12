package com.example.video.editor.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.video.editor.model.Workspace;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {

}
