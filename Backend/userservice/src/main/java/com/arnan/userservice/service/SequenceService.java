package com.arnan.userservice.service;

import com.arnan.userservice.repository.CounterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SequenceService {

    private final CounterRepository counterRepository;

    public String generateAdminRegistrationId() {

        long seq = counterRepository.getNextSequence("admin_reg_seq");

        String regId = String.format("reg%05d", seq);

        log.info("Generated registrationId {}", regId);

        return regId;
    }
}