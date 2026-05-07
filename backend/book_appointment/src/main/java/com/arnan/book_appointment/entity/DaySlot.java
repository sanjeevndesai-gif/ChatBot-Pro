package com.arnan.book_appointment.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DaySlot {

    private String dayName;          // Sunday, Monday, etc.

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;          // 🔥 NEW FIELD

    private Boolean unavailable;     
    private List<Slot> slots;        

    // ================= CONSTRUCTORS =================

    public DaySlot() {
    }

    public DaySlot(String dayName, LocalDate date, Boolean unavailable, List<Slot> slots) {
        this.dayName = dayName;
        this.date = date;
        this.unavailable = unavailable;
        this.slots = slots;
    }

    // ================= GETTERS & SETTERS =================

    public String getDayName() {
        return dayName;
    }

    public void setDayName(String dayName) {
        this.dayName = dayName;
    }

    public LocalDate getDate() {     // 🔥 NEW
        return date;
    }

    public void setDate(LocalDate date) {   // 🔥 NEW
        this.date = date;
    }

    public Boolean getUnavailable() {
        return unavailable;
    }

    public void setUnavailable(Boolean unavailable) {
        this.unavailable = unavailable;
    }

    public List<Slot> getSlots() {
        return slots;
    }

    public void setSlots(List<Slot> slots) {
        this.slots = slots;
    }

    @Override
    public String toString() {
        return "DaySlot{" +
                "dayName='" + dayName + '\'' +
                ", date=" + date +
                ", unavailable=" + unavailable +
                ", slots=" + slots +
                '}';
    }
}