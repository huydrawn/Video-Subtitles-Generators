package com.example.video.editor.config.constant;

import java.util.List;

public class SecurityConstants {

    public static final List<String> PUBLIC_URLS = List.of(
    		"/test/**","/api/public/**", "/oauth2/**", "/sub/**"
    );
}