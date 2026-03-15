package com.arnan.book_appointment.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "schedulers")
public class Scheduler {

    @Id
    private String id;

    private String title;

    private List<String> doctorIds;

    private Integer appointmentDuration;

    // 0 = none, 1 = weekly, 2 = custom
    private Integer repeatType;

    private Integer repeatWeeks;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate customFromDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate customToDate;

    private String fullDayStart;
    private String fullDayEnd;

    private Integer maxBookingsPerDay;

    private List<DaySlot> daySlots;

    private String description;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    // ================= GETTERS & SETTERS =================

    public String getId() {
        return id;
    }

    public void setId(String id) {   // 🔥 THIS WAS MISSING
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public List<String> getDoctorIds() {
        return doctorIds;
    }

    public void setDoctorIds(List<String> doctorIds) {
        this.doctorIds = doctorIds;
    }

    public Integer getAppointmentDuration() {
        return appointmentDuration;
    }

    public void setAppointmentDuration(Integer appointmentDuration) {
        this.appointmentDuration = appointmentDuration;
    }

    public Integer getRepeatType() {
        return repeatType;
    }

    public void setRepeatType(Integer repeatType) {
        this.repeatType = repeatType;
    }

    public Integer getRepeatWeeks() {
        return repeatWeeks;
    }

    public void setRepeatWeeks(Integer repeatWeeks) {
        this.repeatWeeks = repeatWeeks;
    }

    public LocalDate getCustomFromDate() {
        return customFromDate;
    }

    public void setCustomFromDate(LocalDate customFromDate) {
        this.customFromDate = customFromDate;
    }

    public LocalDate getCustomToDate() {
        return customToDate;
    }

    public void setCustomToDate(LocalDate customToDate) {
        this.customToDate = customToDate;
    }

    public String getFullDayStart() {
        return fullDayStart;
    }

    public void setFullDayStart(String fullDayStart) {
        this.fullDayStart = fullDayStart;
    }

    public String getFullDayEnd() {
        return fullDayEnd;
    }

    public void setFullDayEnd(String fullDayEnd) {
        this.fullDayEnd = fullDayEnd;
    }

    public Integer getMaxBookingsPerDay() {
        return maxBookingsPerDay;
    }

    public void setMaxBookingsPerDay(Integer maxBookingsPerDay) {
        this.maxBookingsPerDay = maxBookingsPerDay;
    }

    public List<DaySlot> getDaySlots() {
        return daySlots;
    }

    public void setDaySlots(List<DaySlot> daySlots) {
        this.daySlots = daySlots;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}