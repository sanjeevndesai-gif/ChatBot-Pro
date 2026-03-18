package com.arnan.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.arnan.auth.exception.NotFoundException;
import com.arnan.auth.repository.AuthRepository;
import com.arnan.auth.security.JwtUtil;
import com.arnan.auth.service.AuthService;
import com.arnan.auth.util.UserIdGenerator;

@ExtendWith(MockitoExtension.class)
class AuthServiceTests {

    @Mock
    AuthRepository authRepository;

    @Mock
    MongoTemplate mongoTemplate;

    @Mock
    BCryptPasswordEncoder passwordEncoder;

    @Mock
    JwtUtil jwtUtil;

    @Mock
    UserIdGenerator userIdGenerator;

    @InjectMocks
    AuthService authService;

    // ─────────────────────────────────────────────
    // contextLoads
    // ─────────────────────────────────────────────

    @Test
    void contextLoads() {
        assertNotNull(authService);
    }

    // ─────────────────────────────────────────────
    // getList
    // ─────────────────────────────────────────────

    @Test
    void getListShouldReturnAllUsers() {
        List<Object> expected = new ArrayList<>();
        expected.add(new Document("email", "a@test.com"));
        expected.add(new Document("email", "b@test.com"));

        when(authRepository.getAll()).thenReturn(expected);

        List<Object> result = authService.getList();

        assertNotNull(result);
        assertEquals(2, result.size());
        verify(authRepository, times(1)).getAll();
    }

    // ─────────────────────────────────────────────
    // findById
    // ─────────────────────────────────────────────

    @Test
    void findByIdShouldReturnDocumentWhenFound() {
        ObjectId id = new ObjectId();
        Document expected = new Document("_id", id).append("email", "user@test.com");

        when(authRepository.findById(id)).thenReturn(expected);

        Document result = authService.findById(id.toHexString());

        assertNotNull(result);
        assertEquals("user@test.com", result.getString("email"));
    }

    @Test
    void findByIdShouldThrowNotFoundExceptionWhenUserNotFound() {
        ObjectId id = new ObjectId();

        when(authRepository.findById(id)).thenReturn(null);

        assertThrows(NotFoundException.class, () -> authService.findById(id.toHexString()));
    }

    // ─────────────────────────────────────────────
    // save
    // ─────────────────────────────────────────────

    @Test
    void saveShouldEncryptPassword() {
        when(passwordEncoder.encode(any())).thenReturn("$2a$hashedPassword");
        when(userIdGenerator.generate(anyString())).thenReturn("USR101");
        when(authRepository.findDuplicateUser(anyString(), anyString())).thenReturn(null);

        Document fakeSaved = new Document("fullname", "Test User").append("password", "$2a$hashedPassword");
        when(authRepository.findByName("Test User", "ORG1")).thenReturn(fakeSaved);

        Map<String, Object> body = new HashMap<>();
        body.put("fullname", "Test User");
        body.put("orgId", "ORG1");
        body.put("email", "secure@test.com");
        body.put("phone_number", "9876543210");
        body.put("password", "Test@123");

        authService.save(body);

        Document saved = authService.findByName("Test User", "ORG1");

        assertNotNull(saved);
        assertNotEquals("Test@123", saved.getString("password"));
        verify(passwordEncoder, times(1)).encode("Test@123");
        verify(authRepository, times(1)).save(any(Document.class));
    }

    @Test
    void saveShouldThrowExceptionWhenDuplicateUserExists() {
        Document existingUser = new Document("email", "dup@test.com");
        when(authRepository.findDuplicateUser(anyString(), anyString())).thenReturn(existingUser);

        Map<String, Object> body = new HashMap<>();
        body.put("fullname", "Dup User");
        body.put("email", "dup@test.com");
        body.put("phone_number", "9876543210");
        body.put("password", "Pass@123");

        assertThrows(RuntimeException.class, () -> authService.save(body));
        verify(authRepository, never()).save(any());
    }

    // ─────────────────────────────────────────────
    // update
    // ─────────────────────────────────────────────

    @Test
    void updateShouldEncodePasswordWhenPasswordPresent() {
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$newHash");

        ObjectId id = new ObjectId();
        Map<String, Object> body = new HashMap<>();
        body.put("password", "NewPass@123");
        body.put("email", "user@test.com");

        authService.update(body, "ORG1", id.toHexString());

        verify(passwordEncoder, times(1)).encode("NewPass@123");
        verify(authRepository, times(1)).update(any(Document.class), eq("ORG1"), eq(id));
    }

    @Test
    void updateShouldNotEncodePasswordWhenPasswordAbsent() {
        ObjectId id = new ObjectId();
        Map<String, Object> body = new HashMap<>();
        body.put("email", "user@test.com");

        authService.update(body, "ORG1", id.toHexString());

        verify(passwordEncoder, never()).encode(anyString());
        verify(authRepository, times(1)).update(any(Document.class), eq("ORG1"), eq(id));
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    @Test
    void deleteShouldCallRepositoryDelete() {
        ObjectId id = new ObjectId();

        authService.delete(id.toHexString());

        verify(authRepository, times(1)).delete(id);
    }

    // ─────────────────────────────────────────────
    // login
    // ─────────────────────────────────────────────

    @Test
    void loginShouldThrowNotFoundExceptionWhenEmailNotFound() {
        when(authRepository.findByEmail(anyString())).thenReturn(null);

        Map<String, Object> body = Map.of(
                "email", "invalid@test.com",
                "password", "invalid"
        );

        assertThrows(NotFoundException.class, () -> authService.login(body));
    }

    @Test
    void loginShouldReturnTokenAndUserOnSuccess() {
        ObjectId userId = new ObjectId();
        Document user = new Document()
                .append("_id", userId)
                .append("email", "user@test.com")
                .append("password", "$2a$hashedPassword")
                .append("userId", "USR001")
                .append("fullname", "Test User")
                .append("role", "USER")
                .append("phone_number", "9876543210")
                .append("orgname", "TestOrg");

        when(authRepository.findByEmail("user@test.com")).thenReturn(user);
        when(passwordEncoder.matches("Pass@123", "$2a$hashedPassword")).thenReturn(true);
        when(jwtUtil.generateToken(user)).thenReturn("mock-jwt-token");

        Map<String, Object> body = Map.of(
                "email", "user@test.com",
                "password", "Pass@123"
        );

        Map<String, Object> response = authService.login(body);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.get("token"));
        assertEquals(userId.toHexString(), response.get("userId"));
        assertEquals("Login successful", response.get("message"));

        Document safeUser = (Document) response.get("user");
        assertNotNull(safeUser);
        assertNull(safeUser.getString("password"), "Password must not be present in response");
    }

    @Test
    void loginShouldThrowExceptionForWrongPassword() {
        Document user = new Document()
                .append("_id", new ObjectId())
                .append("email", "user@test.com")
                .append("password", "$2a$hashedPassword");

        when(authRepository.findByEmail("user@test.com")).thenReturn(user);
        when(passwordEncoder.matches("WrongPass", "$2a$hashedPassword")).thenReturn(false);

        Map<String, Object> body = Map.of(
                "email", "user@test.com",
                "password", "WrongPass"
        );

        assertThrows(RuntimeException.class, () -> authService.login(body));
    }

    @Test
    void loginShouldThrowExceptionWhenEmailIsNull() {
        Map<String, Object> body = new HashMap<>();
        body.put("email", null);
        body.put("password", "Pass@123");

        assertThrows(RuntimeException.class, () -> authService.login(body));
    }

    @Test
    void loginShouldThrowExceptionWhenPasswordIsNull() {
        Map<String, Object> body = new HashMap<>();
        body.put("email", "user@test.com");
        body.put("password", null);

        assertThrows(RuntimeException.class, () -> authService.login(body));
    }
}
