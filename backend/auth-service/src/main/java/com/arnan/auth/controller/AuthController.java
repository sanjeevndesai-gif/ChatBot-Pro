package com.arnan.auth.controller;

import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.arnan.auth.service.AuthService;
import com.arnan.auth.service.UserManagementService;

@RestController
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserManagementService userManagementService;

    @GetMapping("/users")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        return userManagementService.getUsersPaginated(page, size, search);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public void addUser(@RequestBody Map<String, Object> body) {
        userManagementService.addStaffUser(body);
    }

    @GetMapping({ "/find/{id}", "/auth-service/find/{id}" })
    @ResponseStatus(HttpStatus.OK)
    public Document findById(@PathVariable String id) {
        return authService.findById(id);
    }

    @GetMapping({ "/findName", "/auth-service/findName" })
    @ResponseStatus(HttpStatus.OK)
    public Document findByName(
            @RequestParam String name,
            @RequestParam String orgId) {
        return authService.findByName(name, orgId);
    }

    @GetMapping({ "/findall", "/auth-service/findall" })
    @ResponseStatus(HttpStatus.OK)
    public List<Object> findAll() {
        return authService.getList();
    }

    // ✅ REGISTER - DO NOT CHANGE
    @PostMapping({ "/register", "/auth-service" })
    @ResponseStatus(HttpStatus.CREATED)
    public void create(@RequestBody Map<String, Object> body) {
        authService.save(body);
    }

    @PutMapping({ "/users", "/auth-service" })
    @ResponseStatus(HttpStatus.OK)
    public void update(
            @RequestBody Map<String, Object> body,
            @RequestParam String orgId,
            @RequestParam String id) {
        authService.update(body, orgId, id);
    }

    @DeleteMapping({ "/users/{id}", "/auth-service/delete/{id}" })
    @ResponseStatus(HttpStatus.OK)
    public void delete(@PathVariable String id) {
        authService.delete(id);
    }

    // ✅ LOGIN
    @PostMapping({ "/login", "/auth-service/login" })
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> login(@RequestBody Map<String, Object> body) {
        return authService.login(body);
    }
}
