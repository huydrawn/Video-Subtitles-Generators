package com.example.video.editor.service;

import org.springframework.stereotype.Service;

import com.example.video.editor.model.AccountTier;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;

@Service
public class PaymentService {

	public Session createCheckoutSession(AccountTier tier,
			String userId, String successUrl, String cancelUrl)
			throws StripeException {
		if (tier.getPriceInCents() == 0) {
			throw new IllegalArgumentException("Gói Free không cần thanh toán.");
		}

		SessionCreateParams params = SessionCreateParams.builder().setMode(SessionCreateParams.Mode.PAYMENT)
				.setSuccessUrl(successUrl).setCancelUrl(cancelUrl)
				.addLineItem(SessionCreateParams.LineItem.builder().setQuantity(1L)
						.setPriceData(SessionCreateParams.LineItem.PriceData.builder().setCurrency("usd")
								.setUnitAmount((long) tier.getPriceInCents())
								.setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
										.setName("Gói " + tier.name()).build())
								.build())
						.build())
				.putMetadata("userId", userId).putMetadata("accountTier", tier.name()).build();

		return Session.create(params);
	}
}