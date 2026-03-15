package com.arnan.chat.whatsapp;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import com.arnan.chat.config.ChatProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class WhatsAppSender {

	private static final Logger log = LoggerFactory.getLogger(WhatsAppSender.class);

	private final RestTemplate rest;
	private final ChatProperties.WhatsApp props;

	public WhatsAppSender(RestTemplate rest, ChatProperties props) {
		this.rest = rest;
		this.props = props.getWhatsapp();
	}

	@SuppressWarnings("unchecked")
	public void sendAuto(String to, Map<String, Object> convo) {

		Instant last = (Instant) convo.get("lastMessageAt");
		boolean expired = last != null && last.isBefore(Instant.now().minus(24, ChronoUnit.HOURS));

		Map<String, Object> message = (Map<String, Object>) convo.get("message");

		if (message == null || message.get("en") == null) {
		log.warn("No message to send (missing 'en' text) for convo={}", convo);
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
		String url = props.getGraphUrl() + "/" + props.getPhoneId() + "/messages";
		HttpHeaders h = new HttpHeaders();
		h.setBearerAuth(props.getToken());
		h.setContentType(MediaType.APPLICATION_JSON);

		HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, h);

		log.debug("Sending WhatsApp request to {}", url);
		rest.postForEntity(url, entity, String.class);
	}
}
