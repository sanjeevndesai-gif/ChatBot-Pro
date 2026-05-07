package com.arnan.book_appointment.util;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class AppointmentNumberGenerator {

    private final AtomicInteger counter = new AtomicInteger(1);

    public String generate() {

        String date =
                LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);

        int number = counter.getAndIncrement();

        return "APPT-" + date + "-" + String.format("%04d", number);
    }
}