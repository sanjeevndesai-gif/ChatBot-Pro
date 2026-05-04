package com.arnan.userservice.controller;

import com.arnan.userservice.exception.ServiceException;
import com.arnan.userservice.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, Object> request) {

        if (request.get("email") == null || request.get("password") == null) {
            throw new ServiceException("Email and password are required", 400);
        }

        return authService.register(request);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, Object> request) {

        if (request.get("email") == null || request.get("password") == null) {
            throw new ServiceException("Email and password are required", 400);
        }

        return authService.login(request);
    }

    @PostMapping("/refresh")
    public Map<String, Object> refresh(@RequestBody Map<String, Object> request) {

        Object token = request.get("refreshToken");

        if (token == null) {
            throw new ServiceException("Refresh token is required", 400);
        }

        return authService.refresh(token.toString());
    }

    @PostMapping("/logout")
    public void logout(@RequestBody Map<String, Object> request) {

        Object token = request.get("refreshToken");

        if (token == null) {
            throw new ServiceException("Refresh token is required", 400);
        }

        authService.logout(token.toString());
    }
}