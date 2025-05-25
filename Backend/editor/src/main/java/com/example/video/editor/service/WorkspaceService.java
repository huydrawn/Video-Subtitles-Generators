package com.example.video.editor.service;

import com.example.video.editor.exception.NotFoundException;
import com.example.video.editor.model.Workspace;

public interface WorkspaceService {
	Workspace getByPublicId(String publicId) throws NotFoundException;

	void rename(Long userId, String newName) throws NotFoundException;

	
}