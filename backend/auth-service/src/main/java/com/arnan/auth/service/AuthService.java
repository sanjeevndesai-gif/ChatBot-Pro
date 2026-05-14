package com.arnan.auth.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.arnan.auth.exception.DuplicateUserException;
import com.arnan.auth.exception.NotFoundException;
import com.arnan.auth.repository.AuthRepository;
import com.arnan.auth.security.JwtUtil;
import com.arnan.auth.util.UserIdGenerator;

import org.bson.Document;

import jakarta.annotation.PostConstruct;

@Service
public class AuthService {
	
	private static final Logger log = LoggerFactory.getLogger(AuthService.class);

	@Autowired
	private AuthRepository authRepository;

	@Autowired
	private UserIdGenerator userIdGenerator;

	@Autowired
	private BCryptPasswordEncoder passwordEncoder;

	@Autowired
	private JwtUtil jwtUtil;

	@Autowired
	private MongoTemplate mongoTemplate;
	
	public Document findByEmail(String email) {
		try {
			return authRepository.findByEmail(email);
		} catch (Exception e) {
			log.error("Error finding user by email {}", email, e);
			return null;
		}
	}

	public Document findByPhone(String phone) {
		try {
			return authRepository.findByPhone(phone);
		} catch (Exception e) {
			log.error("Error finding user by phone {}", phone, e);
			return null;
		}
	}

	

	@PostConstruct
	public void debugInit() {
		System.out.println(">>> AuthService CREATED");
		System.out.println("MongoTemplate = " + mongoTemplate);
		System.out.println("PasswordEncoder = " + passwordEncoder);
		System.out.println("JwtUtil = " + jwtUtil);
	}

	// ===================== CRUD =====================

	public List<Object> getList() {
		try {
			log.info("Fetching all auth records");
			return authRepository.getAll();
		} catch (Exception e) {
			log.error("Error fetching auth records", e);
			throw e;
		}
	}

	public void save(Map<String, Object> documentInfo) {
		try {
			log.info("Saving auth record");

			String fullname = String.valueOf(documentInfo.get("fullname")).trim();
			String email = String.valueOf(documentInfo.get("email")).toLowerCase().trim();
			String phone = String.valueOf(documentInfo.get("phone_number")).trim();

			documentInfo.put("email", email);
			documentInfo.put("phone_number", phone);

			if (authRepository.findDuplicateUser(email, phone) != null) {
				throw new DuplicateUserException("User already exists with this email or phone number");
			}

			String userId = userIdGenerator.generate(fullname);

			String rawPassword = String.valueOf(documentInfo.get("password"));
			documentInfo.put("password", passwordEncoder.encode(rawPassword));

			documentInfo.remove("name");

			Document finalDoc = new Document();
			finalDoc.put("userId", userId);
			finalDoc.putAll(documentInfo);

			authRepository.save(finalDoc);

			log.info("Auth record saved successfully with userId={}", userId);

		} catch (Exception e) {
			log.error("Error saving auth record", e);
			throw e;
		}
	}

	public Document findById(String id) {
		try {
			Document doc = authRepository.findById(new ObjectId(id));
			if (doc == null) {
				throw new NotFoundException("User not found with id: " + id);
			}
			return doc;
		} catch (Exception e) {
			log.error("Error finding auth record id={}", id, e);
			throw e;
		}
	}

	public Document findByName(String name, String orgId) {
		try {
			return authRepository.findByName(name, orgId);
		} catch (Exception e) {
			log.error("Error finding auth record", e);
			throw e;
		}
	}

	public void update(Map<String, Object> documentInfo, String orgId, String id) {
		try {
			if (documentInfo.containsKey("password")) {
				documentInfo.put("password", passwordEncoder.encode(String.valueOf(documentInfo.get("password"))));
			}
			authRepository.update(new Document(documentInfo), orgId, new ObjectId(id));
		} catch (Exception e) {
			log.error("Error updating auth record", e);
			throw e;
		}
	}

	public void delete(String id) {
		try {
			authRepository.delete(new ObjectId(id));
		} catch (Exception e) {
			log.error("Error deleting auth record", e);
			throw e;
		}
	}

	// ===================== LOGIN =====================

	public Map<String, Object> login(Map<String, Object> body) {

		try {
			if (body.get("email") == null || body.get("password") == null) {
				throw new RuntimeException("Email and password are required");
			}

			String email = body.get("email").toString().toLowerCase().trim();
			String password = body.get("password").toString();

			Document user = authRepository.findByEmail(email);

			if (user == null) {
				throw new NotFoundException("User not found with email");
			}

			String hashedPassword = user.getString("password");
			if (!passwordEncoder.matches(password, hashedPassword)) {
				throw new RuntimeException("Invalid credentials");
			}

			String token = jwtUtil.generateToken(user);

			Map<String, Object> response = new HashMap<>();
			response.put("token", token);
			response.put("accessToken", token);
			response.put("refreshToken", token);
			response.put("userId", user.getObjectId("_id").toHexString());

			Document safeUser = new Document(user);
			safeUser.remove("password");


			// Check if user must change password
			boolean mustChangePassword = user.getBoolean("mustChangePassword", false);
			response.put("user", safeUser);
			response.put("mustChangePassword", mustChangePassword);
			response.put("message", mustChangePassword ? "Login successful, password reset required" : "Login successful");

			return response;

		} catch (Exception e) {
			log.error("Login failed", e);
			throw e; // ✅ MUST throw
		}
	}
	
	public BCryptPasswordEncoder getPasswordEncoder() {
		return passwordEncoder;
	}

	public MongoTemplate getMongoTemplate() {
		return mongoTemplate;
	}
	
	/**
	 * Handles forgot password via WhatsApp: generates temp password, updates DB, sends WhatsApp.
	 * Returns a map with keys: status (OK/ERROR), message (string)
	 */
	public Map<String, Object> handleForgotPasswordWhatsApp(String identifier, String chatServiceUrl, RestTemplate restTemplate) {
		Map<String, Object> result = new HashMap<>();
		if (identifier == null || identifier.isBlank()) {
			result.put("status", "ERROR");
			result.put("message", "Identifier (email or phone) is required");
			return result;
		}

		// Lookup user by email or phone
		Document user = identifier.contains("@")
			? findByEmail(identifier.trim().toLowerCase())
			: findByPhone(identifier.trim());
		if (user == null) {
			result.put("status", "ERROR");
			result.put("message", "User not found");
			return result;
		}

		String phone = user.getString("phone_number");
		if (phone == null || phone.isBlank()) {
			result.put("status", "ERROR");
			result.put("message", "No registered phone number found for this user");
			return result;
		}

		// 1. Generate a secure random temporary password
		String tempPassword = java.util.UUID.randomUUID().toString().replaceAll("-", "").substring(0, 10);

		// 2. Hash and update the user's password in the database, set mustChangePassword flag
		org.bson.types.ObjectId userId = user.getObjectId("_id");
		String hashed = passwordEncoder.encode(tempPassword);
		org.bson.Document updateDoc = new org.bson.Document("password", hashed)
			.append("mustChangePassword", true);
		mongoTemplate.getCollection("authInfo")
			.updateOne(new org.bson.Document("_id", userId), new org.bson.Document("$set", updateDoc));

		// 3. Call chat service to send WhatsApp message
		try {
			String chatUrl = chatServiceUrl + "/api/whatsapp/send";
			Map<String, Object> payload = Map.of(
				"to", phone,
				"message", "Your temporary password is: " + tempPassword + ". Please log in and change your password immediately."
			);
			restTemplate.postForEntity(chatUrl, payload, String.class);
			result.put("status", "OK");
			result.put("message", "If your account exists, a temporary password has been sent to your registered WhatsApp number.");
		} catch (Exception e) {
			result.put("status", "ERROR");
			result.put("message", "Failed to send WhatsApp message: " + e.getMessage());
		}
		return result;
	}
}