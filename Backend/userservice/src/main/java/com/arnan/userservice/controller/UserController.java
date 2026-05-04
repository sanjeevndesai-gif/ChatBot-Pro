package com.arnan.userservice.controller;

import com.arnan.userservice.entity.AppUser;
import com.arnan.userservice.entity.PageResponse;
import com.arnan.userservice.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public AppUser createUser(@RequestBody Map<String, Object> payload) {
        return userService.createUser(payload);
    }

//    @GetMapping
//    public List<AppUser> getUsers() {
//        return userService.getUsers();
//    }
    @GetMapping
    public PageResponse<AppUser> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String filters) {

        return userService.getUsers(page, size, search, sort, filters);
    }

    @GetMapping("/{id}")
    public AppUser getUser(@PathVariable String id) {
        return userService.getUser(id);
    }

    @PutMapping("/{id}")
    public AppUser updateUser(@PathVariable String id,
                              @RequestBody Map<String, Object> payload) {
        return userService.updateUser(id, payload);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteUser(@PathVariable String id) {
        return userService.deleteUser(id);
    }
}