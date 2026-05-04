package com.arnan.userservice.service;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.arnan.userservice.entity.AuthUser;
import com.arnan.userservice.repository.AuthUserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CachedUserService {

    private final AuthUserRepository repository;

    @Cacheable(value = "userByEmail", key = "#email")
    public AuthUser getByEmail(String email) {
        return repository.findByEmail(email).orElse(null);
    }

    @Cacheable(value = "userById", key = "#id")
    public AuthUser getById(String id) {
        return repository.findById(id).orElse(null);
    }

    @Caching(
            put = {
                    @CachePut(value = "userByEmail", key = "#user.email"),
                    @CachePut(value = "userById", key = "#user.id")
            }
    )
    public AuthUser cacheUser(AuthUser user) {
        return user;
    }

    @CacheEvict(value = {"userByEmail","userById"}, allEntries = true)
    public void clearCache() {}
}