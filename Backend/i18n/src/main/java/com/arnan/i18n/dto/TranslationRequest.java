package com.arnan.i18n.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

public class TranslationRequest {

	@NotBlank(message = "key is required")
	private String key;

	@NotEmpty(message = "messages map cannot be empty")
	private Map<String, @NotBlank(message = "message value cannot be blank") String> messages;

	public TranslationRequest() {
	}

	public String getKey() {
		return key;
	}

	public void setKey(String key) {
		this.key = key;
	}

	public Map<String, String> getMessages() {
		return messages;
	}

	public void setMessages(Map<String, String> messages) {
		this.messages = messages;
	}

}
