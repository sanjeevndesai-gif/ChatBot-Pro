package com.arnan.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {

    private final SecretKey signingKey;

    private static final long EXPIRY = 1000 * 60 * 60; // 1 hour

    public JwtUtil(@Value("${jwt.secret:}") String jwtSecretFromProperty) {

        String envSecret = System.getenv("JWT_SECRET");

        String finalSecret =
                (jwtSecretFromProperty != null && !jwtSecretFromProperty.isBlank())
                        ? jwtSecretFromProperty
                        : envSecret;

        if (finalSecret == null || finalSecret.isBlank()) {
            throw new IllegalStateException(
                    "JWT secret is not set. Provide 'jwt.secret' or JWT_SECRET env variable."
            );
        }

        // ✅ RAW STRING → SECURE KEY (NO BASE64)
        this.signingKey = Keys.hmacShaKeyFor(
                finalSecret.getBytes(StandardCharsets.UTF_8)
        );
    }

    // =====================================================
    // TOKEN GENERATION
    // =====================================================

    public String generateToken(Document user) {

        return Jwts.builder()
                .setSubject(user.getString("email"))

                // ✅ Custom claims
                .claim("userId", user.getString("userId"))
                .claim("userName", user.getString("fullname"))
                .claim("role", user.getString("role"))
                .claim("phone", user.getString("phone_number"))
                .claim("orgName", user.getString("orgname"))

                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRY))

                .signWith(signingKey)   // ✅ SECURE SIGNING
                .compact();
    }

    public String generateClientCredentialsToken(String clientId, String scope, long expirySeconds) {
        long ttlMs = expirySeconds * 1000;
        return Jwts.builder()
                .setSubject(clientId)
                .claim("scope", scope)
                .claim("token_type", "client_credentials")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + ttlMs))
                .signWith(signingKey)
                .compact();
    }

    // =====================================================
    // EXTRACTION HELPERS
    // =====================================================

    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = extractAllClaims(token);
        return resolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // =====================================================
    // VALIDATION
    // =====================================================

    public boolean isTokenExpired(String token) {
        return extractAllClaims(token)
                .getExpiration()
                .before(new Date());
    }

    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
