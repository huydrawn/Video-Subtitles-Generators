package com.example.video.editor.service.autoSub;

import java.io.File;

public class VietnameseTranscriber implements AudioTranscriber {

    @Override
    public String transcribe(String videoUrl) throws Exception {
        return SubtitleService.generateSubtitleFromVideo(videoUrl, "/vosk-model-vn-0.4");
    }
}