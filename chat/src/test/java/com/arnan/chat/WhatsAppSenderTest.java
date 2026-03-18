package com.arnan.chat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import com.arnan.chat.config.ChatProperties;
import com.arnan.chat.whatsapp.MessageTemplateService;
import com.arnan.chat.whatsapp.WhatsAppSender;

/**
 * Unit tests for WhatsAppSender.
 * RestTemplate is fully mocked — no real WhatsApp messages are sent.
 */
@ExtendWith(MockitoExtension.class)
class WhatsAppSenderTest {

    @Mock
    RestTemplate rest;

    @Mock
    MessageTemplateService messageTemplateService;

    WhatsAppSender sender;

    @BeforeEach
    void setup() {
        ChatProperties props = new ChatProperties();
        ChatProperties.WhatsApp wa = new ChatProperties.WhatsApp();
        wa.setToken("test-token");
        wa.setPhoneId("123456789");
        wa.setGraphUrl("https://graph.facebook.com/v18.0");
        props.setWhatsapp(wa);

        sender = new WhatsAppSender(rest, props, messageTemplateService);
    }

    // ─────────────────────────────────────────────
    // sendText
    // ─────────────────────────────────────────────

    @Test
    void sendTextShouldCallRestTemplateWithCorrectUrl() {
        when(rest.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        sender.sendText("919999999999", "Hello!");

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        verify(rest, times(1)).postForEntity(urlCaptor.capture(), any(), eq(String.class));

        String capturedUrl = urlCaptor.getValue();
        assertTrue(capturedUrl.contains("123456789"),
                "URL should contain the configured phone-id");
        assertTrue(capturedUrl.contains("messages"),
                "URL should end with /messages");
    }

    @Test
    void sendTextShouldThrowWhenMessageIsNull() {
        // Map.of() does not permit null values, so passing a null message throws NPE.
        // This test documents the current contract: callers must not pass a null message.
        assertThrows(NullPointerException.class,
                () -> sender.sendText("919999999999", null));

        // RestTemplate must NOT be called because the exception is thrown before sendRaw
        verify(rest, never()).postForEntity(anyString(), any(), eq(String.class));
    }

    // ─────────────────────────────────────────────
    // sendAuto — recent session → sendText
    // ─────────────────────────────────────────────

    @Test
    void sendAutoShouldSendTextWhenSessionIsRecent() {
        when(messageTemplateService.render(anyString(), any())).thenReturn("Rendered message");
        when(rest.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        Map<String, Object> convo = new HashMap<>();
        convo.put("lastMessageAt", Instant.now());
        convo.put("message", Map.of("en", "template.key"));
        convo.put("context", Map.of());

        sender.sendAuto("919999999999", convo);

        verify(rest, times(1)).postForEntity(anyString(), any(), eq(String.class));
    }

    // ─────────────────────────────────────────────
    // sendAuto — expired session → sendTemplate
    // ─────────────────────────────────────────────

    @Test
    void sendAutoShouldSendTemplateWhenSessionIsExpired() {
        when(messageTemplateService.render(anyString(), any())).thenReturn("Rendered message");
        when(rest.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        Map<String, Object> convo = new HashMap<>();
        // 25 hours ago — beyond the 24-hour WhatsApp message window
        convo.put("lastMessageAt", Instant.now().minus(25, ChronoUnit.HOURS));
        convo.put("message", Map.of("en", "template.key"));
        convo.put("context", Map.of());

        sender.sendAuto("919999999999", convo);

        // Template call still hits the REST endpoint (sendTemplate calls sendRaw)
        verify(rest, atLeastOnce()).postForEntity(anyString(), any(), eq(String.class));
    }

    // ─────────────────────────────────────────────
    // sendAuto — missing message key
    // ─────────────────────────────────────────────

    @Test
    void sendAutoShouldSkipWhenMessageMapIsNull() {
        Map<String, Object> convo = new HashMap<>();
        convo.put("lastMessageAt", Instant.now());
        // no "message" key

        // Should return early without calling rest
        sender.sendAuto("919999999999", convo);

        verify(rest, never()).postForEntity(anyString(), any(), eq(String.class));
    }

    @Test
    void sendAutoShouldSkipWhenEnMessageIsNull() {
        Map<String, Object> convo = new HashMap<>();
        convo.put("lastMessageAt", Instant.now());
        convo.put("message", new HashMap<>()); // no "en" key

        sender.sendAuto("919999999999", convo);

        verify(rest, never()).postForEntity(anyString(), any(), eq(String.class));
    }
}
