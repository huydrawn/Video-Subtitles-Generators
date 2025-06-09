package com.example.video.editor.dto;

import lombok.Data;

@Data
public class PaymentRequest {
    private String tier;       // "PRO", "PREMIUM", ...
    private String successUrl;
    private String cancelUrl;
}