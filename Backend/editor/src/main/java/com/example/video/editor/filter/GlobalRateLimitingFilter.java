package com.example.video.editor.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;

@Component
public class GlobalRateLimitingFilter extends OncePerRequestFilter {

    private final Bucket bucket;

    public GlobalRateLimitingFilter(
            @Value("${rate-limiting.capacity}") int capacity,
            @Value("${rate-limiting.refill-rate}") int refillRate) {
        // Configure rate limiting from application.properties
        Bandwidth limit = Bandwidth.classic(capacity, Refill.intervally(capacity, Duration.ofSeconds(refillRate)));
        this.bucket = Bucket.builder()
                .addLimit(limit)
                .build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        // Kiểm tra nếu lượng yêu cầu đã vượt quá giới hạn
        if (!bucket.tryConsume(1)) {
            // Trả về mã lỗi 429 (TOO MANY REQUESTS)
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("You have exceeded the rate limit. Please try again later.");
            return; // Ngừng tiếp tục chuỗi bộ lọc
        }
        filterChain.doFilter(request, response); // Tiếp tục chuỗi bộ lọc nếu chưa vượt quá giới hạn
    }
}
