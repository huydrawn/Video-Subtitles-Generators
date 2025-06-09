package com.example.video.editor.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cloudinary.api.exceptions.NotFound;
import com.example.video.editor.model.AccountTier;
import com.example.video.editor.repository.UserRepository;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
public class StripeWebhookController {
	@Value("${stripe.webhook-secret}")
	private String endpointSecret;
	private final UserRepository userRepository;

	@PostMapping
	public ResponseEntity<String> handleStripeEvent(@RequestBody String payload,
			@RequestHeader("Stripe-Signature") String sigHeader) throws NotFound {

		Event event;

		try {
			event = Webhook.constructEvent(payload, sigHeader, endpointSecret);
		} catch (SignatureVerificationException e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
		}

		if ("checkout.session.completed".equals(event.getType())) {
			Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
			if (session != null) {
				Long userId = Long.valueOf(session.getMetadata().get("userId"));
				String accountTier = session.getMetadata().get("accountTier");

				var tier = AccountTier.valueOf(accountTier.toUpperCase());
				var user = userRepository.findById(userId)
						.orElseThrow(() -> new NotFound("Not Found userId : " + userId));
				user.setAccountTier(tier);
				userRepository.save(user);

			}
		}
		return ResponseEntity.ok("Received");
	}
}
