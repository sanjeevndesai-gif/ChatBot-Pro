package com.arnan.auth.model;
 
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
 
import java.time.LocalDateTime;
 
@Document(collection = "users")
public class User {
    @Id
    private String id;
 
    private String firstName;
    private String lastName;
    private String email;
    private String company;
    private String occupation;
    private String otherOccupation;
    private String phone;
    private String address;
    private String planSelected;
    private boolean onlinePaymentRequired;
 
    private String password;
    private boolean termsAccepted;
    private boolean active;
    private String role;
    private LocalDateTime createdDate;
 
    // Getters and Setters
    public String getId() { return id; }
 
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
 
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
 
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
 
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
 
    public String getOccupation() { return occupation; }
    public void setOccupation(String occupation) { this.occupation = occupation; }
 
    public String getOtherOccupation() { return otherOccupation; }
    public void setOtherOccupation(String otherOccupation) { this.otherOccupation = otherOccupation; }
 
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
 
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
 
    public String getPlanSelected() { return planSelected; }
    public void setPlanSelected(String planSelected) { this.planSelected = planSelected; }
 
    public boolean isOnlinePaymentRequired() { return onlinePaymentRequired; }
    public void setOnlinePaymentRequired(boolean onlinePaymentRequired) { this.onlinePaymentRequired = onlinePaymentRequired; }
 
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
 
    public boolean isTermsAccepted() { return termsAccepted; }
    public void setTermsAccepted(boolean termsAccepted) { this.termsAccepted = termsAccepted; }
 
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
 
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
 
    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }
}