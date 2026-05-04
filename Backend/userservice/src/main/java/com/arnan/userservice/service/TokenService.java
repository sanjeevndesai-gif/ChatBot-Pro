package com.arnan.userservice.service;

import com.arnan.userservice.entity.RefreshToken;
import com.arnan.userservice.exception.ServiceException;
import com.arnan.userservice.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class TokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${app.jwt.refresh.expiry}")
    private long refreshExpiry;

    public String createRefreshToken(String userId) {

        String token = UUID.randomUUID().toString();
        long expiryTime = System.currentTimeMillis() + refreshExpiry;

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(userId);
        refreshToken.setToken(token);
        refreshToken.setExpiryDate(Instant.ofEpochMilli(expiryTime));

        refreshTokenRepository.save(refreshToken);

        redisTemplate.opsForValue().set(token, userId, refreshExpiry, TimeUnit.MILLISECONDS);

        return token;
    }

    public RefreshToken validateRefreshToken(String token) {

        Object userId = redisTemplate.opsForValue().get(token);
        if (userId == null) {
            throw new ServiceException("Invalid or expired refresh token", 401);
        }

        return refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new ServiceException("Token not found", 401));
    }

    public void deleteRefreshToken(String token) {
        redisTemplate.delete(token);
        refreshTokenRepository.findByToken(token)
                .ifPresent(refreshTokenRepository::delete);
    }
}