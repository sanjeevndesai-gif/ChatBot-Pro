package com.arnan.i18n.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@Document(collection = "translations")
public class Translation {

    @Id
    private String id;  // Mongo _id

    private String key;  // e.g. "header.tagline"

    private Map<String, String> messages; // { en: "...", hi: "..." }

    public Translation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public Map<String, String> getMessages() { return messages; }
    public void setMessages(Map<String, String> messages) { this.messages = messages; }
}
