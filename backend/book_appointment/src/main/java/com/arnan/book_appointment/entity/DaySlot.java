package com.arnan.book_appointment.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class DaySlot {

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;          // 🔥 NEW FIELD

    private Boolean unavailable;     
    private List<Slot> slots;        

    // ================= CONSTRUCTORS =================

    public DaySlot() {
    }

    public DaySlot(LocalDate date, Boolean unavailable, List<Slot> slots) {
        this.date = date;
        this.unavailable = unavailable;
        this.slots = slots;
    }

    // ================= GETTERS & SETTERS =================

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
                ", date=" + date +
                ", unavailable=" + unavailable +
                ", slots=" + slots +
                '}';
    }
}