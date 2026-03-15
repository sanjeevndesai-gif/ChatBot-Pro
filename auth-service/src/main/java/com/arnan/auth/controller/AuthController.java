package com.arnan.auth.controller;

import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.arnan.auth.service.AuthService;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/auth-service")
public class AuthController {

    @Autowired
    private AuthService authService;

    @GetMapping("/find/{id}")
    @ResponseStatus(HttpStatus.OK)
    public Document findById(@PathVariable String id) {
        return authService.findById(id);
    }

    @GetMapping("/findName")
    @ResponseStatus(HttpStatus.OK)
    public Document findByName(
            @RequestParam String name,
            @RequestParam String orgId) {
        return authService.findByName(name, orgId);
    }

    @GetMapping("/findall")
    @ResponseStatus(HttpStatus.OK)
    public List<Object> findAll() {
        return authService.getList();
    }

    // ✅ REGISTER - DO NOT CHANGE
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void create(@RequestBody Map<String, Object> body) {
        authService.save(body);
    }

    @PutMapping
    @ResponseStatus(HttpStatus.OK)
    public void update(
            @RequestBody Map<String, Object> body,
            @RequestParam String orgId,
            @RequestParam String id) {
        authService.update(body, orgId, id);
    }

    @DeleteMapping("/delete/{id}")
    @ResponseStatus(HttpStatus.OK)
    public void delete(@PathVariable String id) {
        authService.delete(id);
    }

    // ✅ LOGIN
    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> login(@RequestBody Map<String, Object> body) {
        return authService.login(body);
    }
}
