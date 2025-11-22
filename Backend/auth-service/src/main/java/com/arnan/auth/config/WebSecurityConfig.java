package com.arnan.auth.config;
 
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
 
@Configuration
@EnableWebSecurity
public class WebSecurityConfig {
 
    /**
     * Define access rules for endpoints.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for simplicity (useful for APIs)
            .csrf(csrf -> csrf.disable())
 
            // Authorize requests
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()  // Allow signup/login
                .anyRequest().authenticated()                // Everything else requires login
            )
 
            // Disable default login form
            .formLogin(login -> login.disable())
            .httpBasic(basic -> basic.disable());
 
        return http.build();
    }
 

}