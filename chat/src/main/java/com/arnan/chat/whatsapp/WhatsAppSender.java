package com.arnan.chat.whatsapp;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class WhatsAppSender {

	@Value("${whatsapp.token}")
	String token;

	@Value("${whatsapp.phoneId}")
	String phoneId;

	@Value("${whatsapp.graph-url}")
	private String graphUrl;

	private final RestTemplate rest = new RestTemplate();

	@SuppressWarnings("unchecked")
	public void sendAuto(String to, Map<String, Object> convo) {

		Instant last = (Instant) convo.get("lastMessageAt");
		boolean expired = last != null && last.isBefore(Instant.now().minus(24, ChronoUnit.HOURS));

		Map<String, Object> message = (Map<String, Object>) convo.get("message");

		if (message == null || message.get("en") == null) {
			System.err.println("❌ No message to send");
			return;
		}

		String text = message.get("en").toString();

		if (expired) {
			sendTemplate(to);
		} else {
			sendText(to, text);
		}
	}

	/* ---------------- SENDERS ---------------- */

	public void sendText(String to, String msg) {

		Map<String, Object> body = Map.of("messaging_product", "whatsapp", "to", to, "type", "text", "text",
				Map.of("body", msg));

		sendRaw(body);
	}

	public void sendTemplate(String to) {

		Map<String, Object> body = Map.of("messaging_product", "whatsapp", "to", to, "type", "template", "template",
				Map.of("name", "GENERIC_TEMPLATE", "language", Map.of("code", "en")));

		sendRaw(body);
	}

	void sendRaw(Map<String, Object> body) {
		String url = graphUrl + "/" + phoneId + "/messages";
		HttpHeaders h = new HttpHeaders();
		h.setBearerAuth(token);
		h.setContentType(MediaType.APPLICATION_JSON);

		HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, h);

		rest.postForEntity(url, entity, String.class);
	}
}
