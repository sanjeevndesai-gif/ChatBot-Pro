package com.arnan.auth.service;

import com.arnan.auth.model.User;
import com.arnan.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class AuthService {

    private static final Logger LOGGER = Logger.getLogger(AuthService.class.getName());

    @Autowired
    private UserRepository userRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /* ----------------------------------------------------
       REGISTER USER
    ---------------------------------------------------- */
    public String registerUser(User user) {
        try {
            if (userRepository.existsByEmail(user.getEmail())) {
                LOGGER.warning("Email already registered: " + user.getEmail());
                return "Email already registered";
            }

            user.setPassword(passwordEncoder.encode(user.getPassword()));
            user.setActive(true);
            user.setRole("USER");
            user.setCreatedDate(LocalDateTime.now());

            userRepository.save(user);
            LOGGER.info("User registered successfully: " + user.getEmail());

            return "User registered successfully";
        } catch (Exception e) {
            LOGGER.severe("Error in registerUser: " + e.getMessage());
            throw new RuntimeException("Registration failed. Please try again.");
        }
    }

    /* ----------------------------------------------------
       LOGIN USER (EMAIL or MOBILE)
    ---------------------------------------------------- */
    public String loginUser(String identifier, String password) {
        try {
            Optional<User> existingUser;

            // Login using email
            if (identifier.contains("@")) {
                existingUser = userRepository.findByEmail(identifier);
            }
            // Login using phone number
            else {
                existingUser = userRepository.findByPhone(identifier);
            }

            if (existingUser.isEmpty()) {
                return "Invalid Email/Mobile or Password";
            }

            User user = existingUser.get();

            if (!passwordEncoder.matches(password, user.getPassword())) {
                return "Invalid Email/Mobile or Password";
            }

            if (!user.isActive()) {
                return "Account is inactive. Contact support.";
            }

            return "Login successful";

        } catch (Exception e) {
            throw new RuntimeException("Login failed.");
        }
    }

    /* ----------------------------------------------------
       UPDATE USER
    ---------------------------------------------------- */
    public String updateUser(String email, User updatedUser) {
        try {
            Optional<User> optionalUser = userRepository.findByEmail(email);
            if (optionalUser.isEmpty()) {
                return "User not found";
            }

            User existingUser = optionalUser.get();

            existingUser.setFirstName(updatedUser.getFirstName());
            existingUser.setLastName(updatedUser.getLastName());
            existingUser.setCompany(updatedUser.getCompany());
            existingUser.setOccupation(updatedUser.getOccupation());
            existingUser.setOtherOccupation(updatedUser.getOtherOccupation());
            existingUser.setPhone(updatedUser.getPhone());
            existingUser.setAddress(updatedUser.getAddress());
            existingUser.setPlanSelected(updatedUser.getPlanSelected());
            existingUser.setOnlinePaymentRequired(updatedUser.isOnlinePaymentRequired());

            userRepository.save(existingUser);

            LOGGER.info("User updated successfully: " + email);
            return "User updated successfully";
        } catch (Exception e) {
            LOGGER.severe("Error in updateUser: " + e.getMessage());
            throw new RuntimeException("Failed to update user.");
        }
    }

    /* ----------------------------------------------------
       DELETE USER
    ---------------------------------------------------- */
    public String deleteUser(String email) {
        try {
            Optional<User> optionalUser = userRepository.findByEmail(email);
            if (optionalUser.isEmpty()) {
                LOGGER.warning("User not found for deletion: " + email);
                return "User not found";
            }

            userRepository.delete(optionalUser.get());
            LOGGER.info("User deleted successfully: " + email);
            return "User deleted successfully";
        } catch (Exception e) {
            LOGGER.severe("Error in deleteUser: " + e.getMessage());
            throw new RuntimeException("Failed to delete user.");
        }
    }
}
