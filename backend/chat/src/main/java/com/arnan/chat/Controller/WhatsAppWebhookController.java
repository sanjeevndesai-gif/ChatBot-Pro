package com.arnan.chat.Controller;

import java.util.Map;
import java.util.stream.Collectors;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.arnan.chat.engine.ChatEngine;
import com.arnan.chat.whatsapp.WhatsAppSender;
import com.fasterxml.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/whatsapp")
public class WhatsAppWebhookController {

	private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookController.class);

	private final ChatEngine chatEngine;
	
	private final WhatsAppSender whatsAppSender;

	public WhatsAppWebhookController(ChatEngine chatEngine, WhatsAppSender whatsAppSender) {
		this.chatEngine = chatEngine;
		this.whatsAppSender = whatsAppSender;
	}

	/**
	 * WhatsApp Cloud API webhook receiver
	 */
	@PostMapping(value = "/webhook", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<Void> webhook(@RequestBody JsonNode root) {

		log.info("📩 Incoming WhatsApp webhook: {}", root);

		// Safety: entry must be array
		if (!root.has("entry") || !root.get("entry").isArray()) {
			log.warn("No entry array found in webhook");
			return ResponseEntity.ok().build();
		}

		root.get("entry").forEach(entry -> {

			if (!entry.has("changes") || !entry.get("changes").isArray()) {
				return;
			}

			entry.get("changes").forEach(change -> {

				JsonNode value = change.path("value");

				// 🚫 Ignore status / delivery / read events
				if (!value.has("messages")) {
					return;
				}

				value.get("messages").forEach(msg -> {

					String from = msg.path("from").asText(null);
					String text = extractUserText(msg);

					if (from == null || text == null) {
						log.warn("Unsupported message payload: {}", msg);
						return;
					}

					log.info("➡️ Message from {} : {}", from, text);

					// ✅ Support two QR deep-link formats:
					// 1) Plain params: "type=doctor&userId=..."
					// 2) REF token: "REF:<base64UrlToken>" where token encodes "type:userId"
					String appointmentType = "general";
					String userId = from;

					if (text != null && text.startsWith("REF:")) {
						String token = text.substring(4).trim();
						try {
							String payload = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
							int idx = payload.indexOf(':');
							if (idx > 0) {
								appointmentType = payload.substring(0, idx);
								userId = payload.substring(idx + 1);
							}
						} catch (Exception e) {
							log.warn("Failed to decode REF token", e);
						}
					} else {
						Map<String, String> params = java.util.stream.Stream.of(text.split("&"))
								.map(s -> s.split("=", 2))
								.filter(arr -> arr.length == 2)
								.collect(Collectors.toMap(arr -> arr[0], arr -> arr[1]));
						appointmentType = params.getOrDefault("type", "general");
						userId = params.getOrDefault("userId", from);
					}
					// Decide flowId dynamically from QR appointmentType.
					// Each flow has its own QR code; the type field in the QR payload
					// determines which conversation is started.
					String flowId = switch (appointmentType.toLowerCase()) {
					// ── New v1.0 QR flows ──
					case "patient"                      -> "PATIENT_FLOW";
					case "find_clinic", "findc"          -> "CLINIC_SEARCH_FLOW";
					case "staff", "support_staff"        -> "STAFF_FLOW";
					// ── Legacy QR flows (unchanged) ──
					case "doctor"                        -> "DOCTOR_FLOW";
					case "dentist"                       -> "DENTIST_FLOW";
					case "salon"                         -> "SALON_FLOW";
					// ── v0.x flows still reachable ──
					case "appointment"                   -> "APPOINTMENT_FLOW";
					case "support"                       -> "SUPPORT_FLOW";
					case "doctor_help", "doctorhelp"     -> "DOCTOR_HELP_FLOW";
					case "clinic", "clinicfinder",
					     "clinic_finder"                -> "CLINIC_FINDER_FLOW";
					// ── Plain 'hi' fallback ──
					default                              -> "MAIN_MENU_FLOW";
					};
					// Pass everything to chat engine 
					chatEngine.process(from, text, flowId, appointmentType, userId);
				});
			});
		});

		return ResponseEntity.ok().build();
	}
	
	@PostMapping("/sendmessage")
	public ResponseEntity<String> sendMessage(@RequestBody Map<String, String> body) {

	    if (body == null) {
	        return ResponseEntity.badRequest().body("Request body is missing ❌");
	    }

	    String number = body.get("number");
	    String message = body.get("message");

	    if (number == null || number.isBlank()) {
	        return ResponseEntity.badRequest().body("Phone number is required ❌");
	    }

	    if (message == null || message.isBlank()) {
	        return ResponseEntity.badRequest().body("Message text is required ❌");
	    }

	    try {
	        whatsAppSender.sendText(number.trim(), message.trim());
	        return ResponseEntity.ok("Message sent successfully ✅");

	    } catch (Exception e) {
	        log.error("Error sending WhatsApp message", e);
	        return ResponseEntity.internalServerError()
	                .body("Failed to send message ❌");
	    }
	}


	/**
	 * Extract text / button / list reply safely
	 */
	private String extractUserText(JsonNode msg) {

		// Normal text message
		if (msg.has("text")) {
			return msg.path("text").path("body").asText();
		}

		// Button reply
		if (msg.path("interactive").has("button_reply")) {
			return msg.path("interactive").path("button_reply").path("id").asText();
		}

		// List reply
		if (msg.path("interactive").has("list_reply")) {
			return msg.path("interactive").path("list_reply").path("id").asText();
		}

		return null;
	}
}
