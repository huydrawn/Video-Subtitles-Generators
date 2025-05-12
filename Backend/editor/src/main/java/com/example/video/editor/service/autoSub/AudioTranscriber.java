package com.example.video.editor.service.autoSub;

public interface AudioTranscriber {
    String transcribe(String videoUrl) throws Exception;
}