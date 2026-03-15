package com.arnan.auth.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.arnan.auth.security.JwtUtil;

@RestController
public class OAuthTokenController {

    private final JwtUtil jwtUtil;
    private final String clientId;
    private final String clientSecret;
    private final String defaultScope;
    private final long expirySeconds;

    public OAuthTokenController(
            JwtUtil jwtUtil,
            @Value("${oauth2.client.id}") String clientId,
            @Value("${oauth2.client.secret}") String clientSecret,
            @Value("${oauth2.default-scope}") String defaultScope,
            @Value("${oauth2.token.expiration-seconds}") long expirySeconds) {
        this.jwtUtil = jwtUtil;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.defaultScope = defaultScope;
        this.expirySeconds = expirySeconds;
    }

    @PostMapping(value = "/oauth2/token", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Map<String, Object>> token(
            @RequestParam("grant_type") String grantType,
            @RequestParam("client_id") String requestClientId,
            @RequestParam("client_secret") String requestClientSecret,
            @RequestParam(value = "scope", required = false) String scope) {

        if (!"client_credentials".equals(grantType)) {
            return oauthError("unsupported_grant_type", "Only client_credentials is supported", HttpStatus.BAD_REQUEST);
        }

        if (!clientId.equals(requestClientId) || !clientSecret.equals(requestClientSecret)) {
            return oauthError("invalid_client", "Invalid client credentials", HttpStatus.UNAUTHORIZED);
        }

        String resolvedScope = StringUtils.hasText(scope) ? scope : defaultScope;
        String accessToken = jwtUtil.generateClientCredentialsToken(requestClientId, resolvedScope, expirySeconds);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("access_token", accessToken);
        response.put("token_type", "Bearer");
        response.put("expires_in", expirySeconds);
        response.put("scope", resolvedScope);

        return ResponseEntity.ok(response);
    }

    private ResponseEntity<Map<String, Object>> oauthError(String error, String description, HttpStatus status) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", error);
        body.put("error_description", description);
        return ResponseEntity.status(status).body(body);
    }
}
