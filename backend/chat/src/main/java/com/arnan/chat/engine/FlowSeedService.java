package com.arnan.chat.engine;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Seeds the 5 conversation flow documents into MongoDB on startup.
 * Idempotent — skips any flow whose _id already exists in the "flows" collection.
 * All flows are editable in MongoDB Compass/Atlas at any time.
 */
@Component
public class FlowSeedService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FlowSeedService.class);
    private static final String COLLECTION = "flows";

    private final MongoTemplate mongo;

    public FlowSeedService(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedIfAbsent(buildMainMenuFlow());
        seedIfAbsent(buildAppointmentFlow());
        seedIfAbsent(buildSupportFlow());
        seedIfAbsent(buildDoctorHelpFlow());
        seedIfAbsent(buildClinicFinderFlow());
    }

    private void seedIfAbsent(Document doc) {
        String id = doc.getString("_id");
        if (mongo.findById(id, Map.class, COLLECTION) == null) {
            mongo.save(doc, COLLECTION);
            log.info("Seeded flow: {}", id);
        } else {
            log.debug("Flow already exists, skipping seed: {}", id);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN_MENU_FLOW
    // Entry point for every organic "hi" message (no QR context).
    // ─────────────────────────────────────────────────────────────────────────
    private Document buildMainMenuFlow() {
        return Document.parse("""
        {
          "_id": "MAIN_MENU_FLOW",
          "start": "MAIN_MENU",
          "steps": {
            "MAIN_MENU": {
              "message": { "en": "👋 Welcome! How can we help you today?\\n\\n1️⃣ Book Appointment\\n2️⃣ Application Support\\n3️⃣ Doctor Help (set schedule / reports)\\n4️⃣ Find Clinic by Location\\n\\nReply with a number (1-4):" },
              "validate": { "values": ["1","2","3","4"], "maxRetries": 3 },
              "saveAs": "flow_choice",
              "next": [
                { "when": "context.flow_choice == '1'", "go": "TO_APPOINTMENT" },
                { "when": "context.flow_choice == '2'", "go": "TO_SUPPORT" },
                { "when": "context.flow_choice == '3'", "go": "TO_DOCTOR_HELP" },
                { "when": "context.flow_choice == '4'", "go": "TO_CLINIC_FINDER" }
              ]
            },
            "TO_APPOINTMENT": {
              "message": { "en": "🏥 Connecting you to appointment booking..." },
              "action": { "type": "FLOW_REDIRECT", "targetFlow": "APPOINTMENT_FLOW" },
              "next": "END"
            },
            "TO_SUPPORT": {
              "message": { "en": "🛠 Connecting you to application support..." },
              "action": { "type": "FLOW_REDIRECT", "targetFlow": "SUPPORT_FLOW" },
              "next": "END"
            },
            "TO_DOCTOR_HELP": {
              "message": { "en": "👨‍⚕️ Connecting you to doctor help..." },
              "action": { "type": "FLOW_REDIRECT", "targetFlow": "DOCTOR_HELP_FLOW" },
              "next": "END"
            },
            "TO_CLINIC_FINDER": {
              "message": { "en": "📍 Connecting you to clinic finder..." },
              "action": { "type": "FLOW_REDIRECT", "targetFlow": "CLINIC_FINDER_FLOW" },
              "next": "END"
            },
            "END": {
              "message": { "en": "Thank you! Type *hi* to start again." },
              "next": null
            }
          }
        }
        """);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPOINTMENT_FLOW
    // Patient enters doctor ID → selects date → selects slot → confirms booking.
    // ─────────────────────────────────────────────────────────────────────────
    private Document buildAppointmentFlow() {
        return Document.parse("""
        {
          "_id": "APPOINTMENT_FLOW",
          "start": "ASK_DOCTOR_ID",
          "steps": {
            "ASK_DOCTOR_ID": {
              "message": { "en": "🏥 *Book an Appointment*\\nPlease enter the Doctor\\'s ID (visible on their profile page):" },
              "saveAs": "target_doctor_id",
              "next": "FETCH_DOCTOR_PROFILE"
            },
            "FETCH_DOCTOR_PROFILE": {
              "message": { "en": "🔍 Fetching doctor info..." },
              "action": {
                "type": "API",
                "service": "AUTH_SERVICE",
                "operation": "GET_USER_PROFILE",
                "request": { "userId": "context.target_doctor_id" },
                "saveAs": "profile"
              },
              "next": "ASK_DATE"
            },
            "ASK_DATE": {
              "message": { "en": "📅 *{ClientName}*\\nPlease enter the appointment date (DD-MM-YYYY):" },
              "saveAs": "date",
              "next": "FETCH_SLOTS"
            },
            "FETCH_SLOTS": {
              "message": { "en": "🔍 Checking available slots..." },
              "action": {
                "type": "API",
                "service": "BOOK_APPOINTMENT_SERVICE",
                "operation": "GET_AVAILABLE_SLOTS",
                "request": {
                  "doctorId": "context.target_doctor_id",
                  "date": "context.date"
                },
                "saveAs": "slots"
              },
              "next": "SELECT_SLOT"
            },
            "SELECT_SLOT": {
              "message": { "en": "⏰ Available slots:\\n{slots}\\n\\nEnter slot number:" },
              "validate": { "values": ["1","2","3","4","5","6","7","8"], "maxRetries": 3 },
              "saveAs": "slot_choice",
              "next": "BOOK_APPOINTMENT"
            },
            "BOOK_APPOINTMENT": {
              "message": { "en": "✅ Booking your appointment..." },
              "action": {
                "type": "API",
                "service": "BOOK_APPOINTMENT_SERVICE",
                "operation": "CREATE_APPOINTMENT",
                "request": {
                  "doctorId": "context.target_doctor_id",
                  "patientPhone": "context.userId",
                  "appointmentDate": "context.date",
                  "slot": "context.slot_choice",
                  "appointmentType": "context.appointment_type"
                },
                "saveAs": "booking_result"
              },
              "next": "BOOKING_DONE"
            },
            "BOOKING_DONE": {
              "message": { "en": "🎉 *Appointment Booked!*\\nYour appointment has been confirmed. Type *hi* to start over." },
              "next": null
            }
          }
        }
        """);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUPPORT_FLOW
    // Patient picks issue type → describes it → ticket saved to MongoDB.
    // ─────────────────────────────────────────────────────────────────────────
    private Document buildSupportFlow() {
        return Document.parse("""
        {
          "_id": "SUPPORT_FLOW",
          "start": "SUPPORT_MENU",
          "steps": {
            "SUPPORT_MENU": {
              "message": { "en": "🛠 *Application Support*\\nPlease select issue type:\\n\\n1️⃣ Technical Issue\\n2️⃣ Billing Issue\\n3️⃣ General Query\\n\\nReply with 1, 2 or 3:" },
              "validate": { "values": ["1","2","3"], "maxRetries": 3 },
              "saveAs": "issue_type",
              "next": "DESCRIBE_ISSUE"
            },
            "DESCRIBE_ISSUE": {
              "message": { "en": "📝 Please describe your issue in detail:" },
              "saveAs": "issue_description",
              "next": "CREATE_TICKET"
            },
            "CREATE_TICKET": {
              "message": { "en": "📋 Creating your support ticket..." },
              "action": {
                "type": "MONGO_INSERT",
                "collection": "support_tickets",
                "saveAs": "ticket",
                "request": {
                  "phone": "context.userId",
                  "issueType": "context.issue_type",
                  "description": "context.issue_description",
                  "status": "OPEN"
                }
              },
              "next": "TICKET_DONE"
            },
            "TICKET_DONE": {
              "message": { "en": "✅ *Support Ticket Created!*\\nTicket ID: *{ticketId}*\\n\\nOur team will contact you via WhatsApp. Type *hi* to return to the main menu." },
              "next": null
            }
          }
        }
        """);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DOCTOR_HELP_FLOW
    // Doctor chooses: (1) set schedule availability OR (2) view appointment report.
    // userId in session context = doctor's WhatsApp phone number / userId.
    // ─────────────────────────────────────────────────────────────────────────
    private Document buildDoctorHelpFlow() {
        return Document.parse("""
        {
          "_id": "DOCTOR_HELP_FLOW",
          "start": "DOCTOR_MENU",
          "steps": {
            "DOCTOR_MENU": {
              "message": { "en": "👨‍⚕️ *Doctor Help Menu*\\n\\n1️⃣ Set Schedule Availability\\n2️⃣ View Appointment Report\\n\\nReply 1 or 2:" },
              "validate": { "values": ["1","2"], "maxRetries": 3 },
              "saveAs": "doctor_action",
              "next": [
                { "when": "context.doctor_action == '1'", "go": "SET_SCHEDULE_DATE" },
                { "when": "context.doctor_action == '2'", "go": "REPORT_ASK_DATE" }
              ]
            },
            "SET_SCHEDULE_DATE": {
              "message": { "en": "📅 Enter the date to set availability (DD-MM-YYYY):" },
              "saveAs": "schedule_date",
              "next": "SET_SCHEDULE_START"
            },
            "SET_SCHEDULE_START": {
              "message": { "en": "⏰ Enter start time (e.g. 09:00):" },
              "saveAs": "schedule_start",
              "next": "SET_SCHEDULE_END"
            },
            "SET_SCHEDULE_END": {
              "message": { "en": "⏰ Enter end time (e.g. 17:00):" },
              "saveAs": "schedule_end",
              "next": "SAVE_SCHEDULE"
            },
            "SAVE_SCHEDULE": {
              "message": { "en": "💾 Saving your schedule..." },
              "action": {
                "type": "API",
                "service": "BOOK_APPOINTMENT_SERVICE",
                "operation": "SAVE_SCHEDULE",
                "request": {
                  "doctorId": "context.userId",
                  "date": "context.schedule_date",
                  "startTime": "context.schedule_start",
                  "endTime": "context.schedule_end"
                },
                "saveAs": "schedule_result"
              },
              "next": "SCHEDULE_SAVED"
            },
            "SCHEDULE_SAVED": {
              "message": { "en": "✅ Schedule saved for *{schedule_date}*!\\nType *hi* to return to the main menu." },
              "next": null
            },
            "REPORT_ASK_DATE": {
              "message": { "en": "📊 Enter the date for the report (DD-MM-YYYY):" },
              "saveAs": "report_date",
              "next": "FETCH_REPORT"
            },
            "FETCH_REPORT": {
              "message": { "en": "🔍 Fetching your appointment report..." },
              "action": {
                "type": "API",
                "service": "BOOK_APPOINTMENT_SERVICE",
                "operation": "GET_APPOINTMENT_REPORT",
                "request": {
                  "userId": "context.userId",
                  "date": "context.report_date"
                },
                "saveAs": "report"
              },
              "next": "SHOW_REPORT"
            },
            "SHOW_REPORT": {
              "message": { "en": "📋 *Appointment Report*\\n\\n{report}\\n\\nType *hi* to return to the main menu." },
              "next": null
            }
          }
        }
        """);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CLINIC_FINDER_FLOW
    // Patient enters city → sees clinics/doctors → picks one → books appointment.
    // Self-contained (no FLOW_REDIRECT needed — booking steps are included).
    // ─────────────────────────────────────────────────────────────────────────
    private Document buildClinicFinderFlow() {
        return Document.parse("""
        {
          "_id": "CLINIC_FINDER_FLOW",
          "start": "ASK_CITY",
          "steps": {
            "ASK_CITY": {
              "message": { "en": "📍 *Find a Clinic*\\nPlease enter your city or area name:" },
              "saveAs": "user_city",
              "next": "FETCH_CLINICS"
            },
            "FETCH_CLINICS": {
              "message": { "en": "🔍 Searching clinics near *{user_city}*..." },
              "action": {
                "type": "API",
                "service": "AUTH_SERVICE",
                "operation": "GET_CLINICS_BY_LOCATION",
                "request": { "city": "context.user_city" },
                "saveAs": "clinics"
              },
              "next": "SHOW_CLINICS"
            },
            "SHOW_CLINICS": {
              "message": { "en": "🏥 Clinics near you:\\n\\n{clinic_list}\\n\\nEnter clinic number to select:" },
              "validate": { "values": ["1","2","3","4","5"], "maxRetries": 3 },
              "saveAs": "clinic_choice",
              "next": "SELECT_DOCTOR_DATE"
            },
            "SELECT_DOCTOR_DATE": {
              "message": { "en": "📅 Enter preferred appointment date (DD-MM-YYYY):" },
              "saveAs": "date",
              "next": "FETCH_CLINIC_SLOTS"
            },
            "FETCH_CLINIC_SLOTS": {
              "message": { "en": "🔍 Checking available slots..." },
              "action": {
                "type": "API",
                "service": "BOOK_APPOINTMENT_SERVICE",
                "operation": "GET_AVAILABLE_SLOTS",
                "request": {
                  "doctorId": "context.user_city",
                  "date": "context.date"
                },
                "saveAs": "slots"
              },
              "next": "SELECT_CLINIC_SLOT"
            },
            "SELECT_CLINIC_SLOT": {
              "message": { "en": "⏰ Available slots:\\n{slots}\\n\\nEnter slot number:" },
              "validate": { "values": ["1","2","3","4","5","6","7","8"], "maxRetries": 3 },
              "saveAs": "slot_choice",
              "next": "BOOK_CLINIC_APPOINTMENT"
            },
            "BOOK_CLINIC_APPOINTMENT": {
              "message": { "en": "✅ Booking your appointment..." },
              "action": {
                "type": "API",
                "service": "BOOK_APPOINTMENT_SERVICE",
                "operation": "CREATE_APPOINTMENT",
                "request": {
                  "patientPhone": "context.userId",
                  "appointmentDate": "context.date",
                  "slot": "context.slot_choice",
                  "clinicChoice": "context.clinic_choice",
                  "appointmentType": "general"
                },
                "saveAs": "booking_result"
              },
              "next": "CLINIC_BOOKING_DONE"
            },
            "CLINIC_BOOKING_DONE": {
              "message": { "en": "🎉 *Appointment Booked!*\\nYour appointment has been confirmed. Type *hi* to start over." },
              "next": null
            }
          }
        }
        """);
    }
}
