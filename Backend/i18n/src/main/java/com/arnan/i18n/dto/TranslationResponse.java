package com.arnan.i18n.dto;

import java.util.Map;

public class TranslationResponse {

	private String key;
	private Map<String, String> messages;

	public TranslationResponse() {
	}

	public TranslationResponse(String key, Map<String, String> messages) {
		this.key = key;
		this.messages = messages;
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
