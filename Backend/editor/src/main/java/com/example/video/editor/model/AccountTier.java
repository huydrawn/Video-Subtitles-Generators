package com.example.video.editor.model;

public enum AccountTier {
	FREE(0, 100), // 0đ - 100MB
	BASIC(200, 100), // $2 = 200 cent - 100MB
	PRO(500, 500), // $5 = 500 cent - 500MB
	PREMIUM(1000, 1024); // $10 = 1000 cent - 1GB

	private final int priceInCents; 
	private final int storageLimitMb;

	AccountTier(int priceInCents, int storageLimitMb) {
		this.priceInCents = priceInCents;
		this.storageLimitMb = storageLimitMb;
	}

	public int getPriceInCents() {
		return priceInCents;
	}

	public int getStorageLimitMb() {
		return storageLimitMb;
	}

	public String getFormattedPrice() {
		return priceInCents == 0 ? "Free" : String.format("$%.2f", priceInCents / 100.0);
	}
}