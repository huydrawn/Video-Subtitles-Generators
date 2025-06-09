package com.example.video.editor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AccountTierDTO {
	private String name; // FREE, PRO, etc.
	private int storageLimitMb; // 100, 500, etc.
	private int priceInCents; // 0, 500, etc.
	private String formattedPrice; // Free / $5.00
}