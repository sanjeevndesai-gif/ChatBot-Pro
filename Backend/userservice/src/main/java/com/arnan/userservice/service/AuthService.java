package com.arnan.userservice.service;

import com.arnan.userservice.entity.AuthUser;
import com.arnan.userservice.entity.RefreshToken;
import com.arnan.userservice.enums.UserPlan;
import com.arnan.userservice.enums.UserRole;
import com.arnan.userservice.enums.UserStatus;
import com.arnan.userservice.exception.ServiceException;
import com.arnan.userservice.repository.AuthUserRepository;
import com.arnan.userservice.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthUserRepository authUserRepository;
	private final CachedUserService cachedUserService;
	private final SequenceService sequenceService;
	private final BCryptPasswordEncoder passwordEncoder;
	private final JwtUtil jwtUtil;
	private final TokenService tokenService;

	public Map<String, Object> register(Map<String, Object> request) {

		String email = request.get("email").toString().toLowerCase();
		String password = request.get("password").toString();

		if (cachedUserService.getByEmail(email) != null) {
			throw new ServiceException("Email already registered", 400);
		}

		String registrationId = sequenceService.generateAdminRegistrationId();

		AuthUser user = new AuthUser();
		user.setEmail(email);
		user.setPassword(passwordEncoder.encode(password));
		user.setRegistrationId(registrationId);

		// using enum codes ⭐
		user.setRole(UserRole.ADMIN.getCode());
		user.setStatus(UserStatus.ACTIVE.getCode());
		user.setPlan(UserPlan.FREE.getCode());
		user.setPlanExpiry(Instant.now().plus(7, ChronoUnit.DAYS)); // today + 7 days expiry
		// remove sensitive fields from payload
		request.remove("password");
		user.setPayload(request);
		user.setCreatedAt(Instant.now());

		authUserRepository.save(user);

		String accessToken = jwtUtil.generateAccessToken(user.getId(), "ADMIN", registrationId);

		String refreshToken = tokenService.createRefreshToken(user.getId());

		return Map.of("accessToken", accessToken, "refreshToken", refreshToken, "registrationId", registrationId);
	}

	public Map<String, Object> login(Map<String, Object> request) {

		String email = request.get("email").toString().toLowerCase();
		String password = request.get("password").toString();

		AuthUser user = cachedUserService.getByEmail(email);

		if (user == null) {
		    throw new ServiceException("Invalid credentials", 401);
		}

		if (!passwordEncoder.matches(password, user.getPassword())) {
			throw new ServiceException("Invalid credentials", 401);
		}

		// ⭐ NEW LOGIN RULE (SaaS)
		if (!"1".equals(user.getStatus())) {
			throw new ServiceException("Your account is inactive or subscription expired. Please contact support.",
					403);
		}

		String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getRole(), user.getRegistrationId());

		String refreshToken = tokenService.createRefreshToken(user.getId());

		return Map.of("accessToken", accessToken, "refreshToken", refreshToken);
	}

	public Map<String, Object> refresh(String refreshToken) {

		RefreshToken tokenDoc = tokenService.validateRefreshToken(refreshToken);

		AuthUser user = cachedUserService.getById(tokenDoc.getUserId());
				if (user == null) {
				    throw new ServiceException("User not found", 404);
				}
				

		String newAccessToken = jwtUtil.generateAccessToken(user.getId(), user.getRole(), user.getRegistrationId());

		return Map.of("accessToken", newAccessToken);
	}

	public void logout(String refreshToken) {
		tokenService.deleteRefreshToken(refreshToken);
	}
}