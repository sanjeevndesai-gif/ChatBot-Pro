package com.arnan.book_appointment.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class Slot {

    private String start;
    private String end;

    /*
        1 = Emergency
        0 = Normal
     */
    private Integer emergencyType;

    // ================= CONSTRUCTORS =================

    public Slot() {
    }

    public Slot(String start, String end, Integer emergencyType) {
        this.start = start;
        this.end = end;
        this.emergencyType = emergencyType;
    }

    // ================= GETTERS & SETTERS =================

    public String getStart() {
        return start;
    }

    public void setStart(String start) {
        this.start = start;
    }

    public String getEnd() {
        return end;
    }

    public void setEnd(String end) {
        this.end = end;
    }

    public Integer getEmergencyType() {
        return emergencyType;
    }

    public void setEmergencyType(Integer emergencyType) {
        this.emergencyType = emergencyType;
    }

    /*
        🔥 IMPORTANT CONVERSION LOGIC
        If frontend sends:
        "emergency": true  → store 1
        "emergency": false → store 0
     */
    @JsonProperty("emergency")
    public void setEmergency(Boolean emergency) {
        if (emergency != null) {
            this.emergencyType = emergency ? 1 : 0;
        }
    }

    // Optional helper
    public boolean isEmergency() {
        return emergencyType != null && emergencyType == 1;
    }

    @Override
    public String toString() {
        return "Slot{" +
                "start='" + start + '\'' +
                ", end='" + end + '\'' +
                ", emergencyType=" + emergencyType +
                '}';
    }
}