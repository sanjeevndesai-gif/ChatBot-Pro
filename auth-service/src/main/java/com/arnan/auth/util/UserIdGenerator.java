package com.arnan.auth.util;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class UserIdGenerator {

    @Autowired
    MongoSequenceGenerator sequenceGenerator;

    public String generate(String name) {

        String prefix =
                name.length() >= 4 ?
                name.substring(0, 4).toLowerCase() :
                name.toLowerCase();

        String date = LocalDate.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        long seq = sequenceGenerator.getNextSequence("user");

        String serial = String.format("%04d", seq);

        return prefix + date + serial;
    }
}
