package com.example.video.editor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"project"})
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "video_id")
    private Long videoId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "cloudinary_public_id", unique = true, nullable = false, length = 255)
    private String cloudinaryPublicId;

    @Column(name = "url", nullable = false, length = 2048)
    private String url;
    
    private String thumbnailUrl;

    @Column(name = "secure_url", nullable = false, length = 2048)
    private String secureUrl;

    @Column(name = "resource_type", nullable = false, length = 50)
    private String resourceType; // Ví dụ: "video"

    @Column(name = "format", nullable = false, length = 50)
    private String format; // Ví dụ: "mp4", "mov"

    @Column(name = "duration", nullable = true)
    private Float duration; // Thời lượng video (giây)

    @Column(name = "bytes", nullable = true)
    private Long bytes; // Kích thước video (byte)

    @Column(name = "width", nullable = true)
    private Integer width; // Chiều rộng video (pixels)

    @Column(name = "height", nullable = true)
    private Integer height; // Chiều cao video (pixels)

    // Các trường metadata tùy chọn khác mà Cloudinary có thể cung cấp
    // Ví dụ: frame_rate, bit_rate, etc.

//     Quan hệ với Project (nếu bạn đã thiết lập)
     @OneToOne(mappedBy = "video")
     private Project project;
}