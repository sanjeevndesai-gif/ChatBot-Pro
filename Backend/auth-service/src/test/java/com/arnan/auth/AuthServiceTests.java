package com.arnan.auth;
 
import com.arnan.auth.model.User;
import com.arnan.auth.repository.UserRepository;
import com.arnan.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
 
import java.util.Optional;
 
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
 
@ExtendWith(MockitoExtension.class)
class AuthServiceTests {
 
    @Mock
    private UserRepository userRepository;
 
    @InjectMocks
    private AuthService authService;
 
    @Test
    void testRegisterUser() {
        User user = new User();
        user.setEmail("test@test.com");
        user.setPassword("123");
        user.setTermsAccepted(true);
        
 
        when(userRepository.existsByEmail("test@test.com")).thenReturn(false);
 
        String result = authService.registerUser(user);
        assertEquals("User registered successfully", result);
    }
 
    @Test
    void testLoginUser() {
        User user = new User();
        user.setEmail("test@test.com");
        user.setPassword(new BCryptPasswordEncoder().encode("123"));
        user.setActive(true);
        
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
 
        String result = authService.loginUser("test@test.com", "123");
        assertEquals("Login successful", result);
    }
}