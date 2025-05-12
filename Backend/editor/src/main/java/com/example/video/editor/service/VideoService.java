package com.example.video.editor.service;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.video.editor.model.Video;
import com.example.video.editor.repository.VideoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VideoService {

    private final VideoRepository videoRepository;
    private final Cloudinary cloudinary; // Inject Cloudinary bean

    public Video uploadVideoToCloudinary(MultipartFile file, String title) throws IOException {
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "resource_type", "video",
                "folder", "video_editor" // Optional: Thư mục trên Cloudinary
        ));

        Video video = Video.builder()
                .title(title)
                .cloudinaryPublicId((String) uploadResult.get("public_id"))
                .url((String) uploadResult.get("url"))
                .secureUrl((String) uploadResult.get("secure_url"))
                .resourceType((String) uploadResult.get("resource_type"))
                .format((String) uploadResult.get("format"))
                .duration(((Number) uploadResult.get("duration")).floatValue())
                .bytes(((Number) uploadResult.get("bytes")).longValue())
                .width((Integer) uploadResult.get("width"))
                .height((Integer) uploadResult.get("height"))
                .build();

        return videoRepository.save(video);
    }

    public Optional<Video> getVideoById(Long id) {
        return videoRepository.findById(id);
    }

    public Optional<Video> getVideoByPublicId(String publicId) {
        return videoRepository.findByCloudinaryPublicId(publicId);
    }

    public void deleteVideoFromCloudinary(String publicId) throws IOException {
        cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "video"));
        videoRepository.deleteByCloudinaryPublicId(publicId);
    }

    // Các phương thức khác liên quan đến Video (ví dụ: lấy danh sách video)
}