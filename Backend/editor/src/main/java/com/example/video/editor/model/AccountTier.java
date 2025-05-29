package com.example.video.editor.model;

public enum AccountTier {
	FREE(100), PRO(500), PREMIUM(1024); // 1GB = 1024MB

	private final int storageLimitMb;

	AccountTier(int storageLimitMb) {
		this.storageLimitMb = storageLimitMb;
	}

	public int getStorageLimitMb() {
		return storageLimitMb;
	}
}