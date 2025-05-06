package com.example.video.editor.controller;
import org.springframework.stereotype.Controller;

import com.example.video.editor.service.progess.TaskProcessingService;

@Controller
public class TaskWebSocketController {

    private final TaskProcessingService taskProcessingService;

    public TaskWebSocketController(TaskProcessingService taskProcessingService) {
        this.taskProcessingService = taskProcessingService;
    }
}
