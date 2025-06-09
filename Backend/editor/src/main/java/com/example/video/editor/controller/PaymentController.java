package com.example.video.editor.controller;

import java.util.Collections;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.video.editor.model.AccountTier;
import com.example.video.editor.model.SecurityUser;
import com.example.video.editor.service.PaymentService;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

	private final PaymentService paymentService;

	public static class PaymentRequest {
		public String accountTier;
		public String successUrl;
		public String cancelUrl;
	}

	@PostMapping("/create-checkout-session")
	public Map<String, String> createCheckoutSession(@RequestBody PaymentRequest request,
			@AuthenticationPrincipal SecurityUser user) throws StripeException {
		AccountTier tier;
		try {
			tier = AccountTier.valueOf(request.accountTier.toUpperCase());
		} catch (IllegalArgumentException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid account tier");
		}

		if (tier.getPriceInCents() == 0) {
			return Collections.singletonMap("message", "No payment needed for free tier");
		}

		Session session = paymentService.createCheckoutSession(tier, user.getUserId().toString(), request.successUrl,
				request.cancelUrl);
		return Collections.singletonMap("sessionId", session.getId());
	}
}