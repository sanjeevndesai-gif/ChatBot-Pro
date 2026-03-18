package com.arnan.book_appointment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.arnan.book_appointment.exception.AppointmentNotFoundException;
import com.arnan.book_appointment.repository.AppointmentRepository;
import com.arnan.book_appointment.repository.SchedulerRepository;
import com.arnan.book_appointment.service.AppointmentService;
import com.arnan.book_appointment.service.SchedulerService;
import com.arnan.book_appointment.util.AppointmentNumberGenerator;

@ExtendWith(MockitoExtension.class)
class BookAppointmentApplicationTests {

    // ─────────────────────────────────────────────────────────────────────────
    // AppointmentService tests
    // ─────────────────────────────────────────────────────────────────────────

    @Mock
    AppointmentRepository appointmentRepository;

    @Mock
    AppointmentNumberGenerator numberGenerator;

    @InjectMocks
    AppointmentService appointmentService;

    // ─────────────────────────────────────────────────────────────────────────
    // SchedulerService tests
    // ─────────────────────────────────────────────────────────────────────────

    @Mock
    SchedulerRepository schedulerRepository;

    @InjectMocks
    SchedulerService schedulerService;

    // ════════════════════════════════════════════════════════════════════════
    // AppointmentService
    // ════════════════════════════════════════════════════════════════════════

    @Test
    void contextLoads() {
        assertNotNull(appointmentService);
        assertNotNull(schedulerService);
    }

    @Test
    void createShouldPersistAppointmentWithGeneratedNumber() {
        when(numberGenerator.generate()).thenReturn("APPT-20260101-0001");

        Document appt = new Document("patientName", "Alice");
        Document result = appointmentService.create(appt);

        verify(appointmentRepository, times(1)).save(appt);
        assertEquals("APPT-20260101-0001", result.getString("appointmentNumber"));
        assertEquals("BOOKED", result.getString("status"));
        assertNotNull(result.get("createdAt"));
    }

    @Test
    void createShouldNotOverrideExistingStatus() {
        when(numberGenerator.generate()).thenReturn("APPT-20260101-0002");

        Document appt = new Document("patientName", "Bob").append("status", "CONFIRMED");
        Document result = appointmentService.create(appt);

        assertEquals("CONFIRMED", result.getString("status"));
    }

    @Test
    void updateShouldReturnUpdatedDocument() {
        ObjectId id = new ObjectId();
        Document existing = new Document("_id", id)
                .append("appointmentNumber", "APPT-20260101-0001")
                .append("patientName", "Alice")
                .append("createdAt", "2026-01-01T10:00:00");

        when(appointmentRepository.findById(id)).thenReturn(existing);

        Document updated = new Document("patientName", "Alice Updated");
        Document result = appointmentService.update(id.toHexString(), updated);

        verify(appointmentRepository).update(any(Document.class), eq(id));
        assertEquals("APPT-20260101-0001", result.getString("appointmentNumber"));
        assertEquals(id.toHexString(), result.getString("id"));
    }

    @Test
    void updateShouldThrowWhenAppointmentNotFound() {
        ObjectId id = new ObjectId();
        when(appointmentRepository.findById(id)).thenReturn(null);

        Document updated = new Document("patientName", "Ghost");
        assertThrows(AppointmentNotFoundException.class,
                () -> appointmentService.update(id.toHexString(), updated));
        verify(appointmentRepository, never()).update(any(), any());
    }

    @Test
    void cancelShouldDeleteExistingAppointment() {
        ObjectId id = new ObjectId();
        Document existing = new Document("_id", id).append("patientName", "Alice");
        when(appointmentRepository.findById(id)).thenReturn(existing);

        appointmentService.cancel(id.toHexString());

        verify(appointmentRepository, times(1)).delete(id);
    }

    @Test
    void cancelShouldThrowWhenAppointmentNotFound() {
        ObjectId id = new ObjectId();
        when(appointmentRepository.findById(id)).thenReturn(null);

        assertThrows(AppointmentNotFoundException.class,
                () -> appointmentService.cancel(id.toHexString()));
        verify(appointmentRepository, never()).delete(any());
    }

    @Test
    void getByIdShouldReturnDocumentWithHexId() {
        ObjectId id = new ObjectId();
        Document doc = new Document("_id", id).append("patientName", "Alice");
        when(appointmentRepository.findById(id)).thenReturn(doc);

        Document result = appointmentService.getById(id.toHexString());

        assertNotNull(result);
        assertEquals(id.toHexString(), result.getString("id"));
    }

    @Test
    void getByIdShouldThrowWhenNotFound() {
        ObjectId id = new ObjectId();
        when(appointmentRepository.findById(id)).thenReturn(null);

        assertThrows(AppointmentNotFoundException.class,
                () -> appointmentService.getById(id.toHexString()));
    }

    @Test
    void getAllShouldDelegateToRepository() {
        Document d1 = new Document("patientName", "Alice");
        Document d2 = new Document("patientName", "Bob");
        when(appointmentRepository.getAll()).thenReturn(List.of(d1, d2));

        List<Document> result = appointmentService.getAll();

        assertEquals(2, result.size());
        verify(appointmentRepository, times(1)).getAll();
    }

    @Test
    void getByDateRangeShouldDelegateToRepository() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 1, 31);
        when(appointmentRepository.findByDateRange(from, to)).thenReturn(List.of());

        List<Document> result = appointmentService.getByDateRange(from, to);

        assertNotNull(result);
        verify(appointmentRepository, times(1)).findByDateRange(from, to);
    }

    // ════════════════════════════════════════════════════════════════════════
    // AppointmentNumberGenerator
    // ════════════════════════════════════════════════════════════════════════

    @Test
    void appointmentNumberGeneratorShouldReturnUniqueNumbers() {
        AppointmentNumberGenerator gen = new AppointmentNumberGenerator();

        String n1 = gen.generate();
        String n2 = gen.generate();

        assertTrue(n1.startsWith("APPT-"));
        assertTrue(n2.startsWith("APPT-"));
        assertNotEquals(n1, n2);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SchedulerService
    // ════════════════════════════════════════════════════════════════════════

    @Test
    void schedulerCreateShouldPersistDocument() {
        Document scheduler = new Document("doctorId", "D001");

        Document result = schedulerService.create(scheduler);

        verify(schedulerRepository, times(1)).save(scheduler);
        assertNotNull(result.get("createdAt"));
        assertNotNull(result.get("updatedAt"));
    }

    @Test
    void schedulerUpdateShouldReturnUpdatedDocument() {
        ObjectId id = new ObjectId();
        Document existing = new Document("_id", id)
                .append("doctorId", "D001")
                .append("createdAt", "2026-01-01");

        when(schedulerRepository.findById(id)).thenReturn(existing);

        Document updated = new Document("doctorId", "D001").append("name", "Updated");
        Document result = schedulerService.update(id.toHexString(), updated);

        verify(schedulerRepository, times(1)).update(any(Document.class), eq(id));
        assertEquals(id.toHexString(), result.getString("id"));
    }

    @Test
    void schedulerUpdateShouldThrowWhenNotFound() {
        ObjectId id = new ObjectId();
        when(schedulerRepository.findById(id)).thenReturn(null);

        assertThrows(AppointmentNotFoundException.class,
                () -> schedulerService.update(id.toHexString(), new Document("name", "x")));
    }

    @Test
    void schedulerDeleteShouldCallRepository() {
        ObjectId id = new ObjectId();
        Document existing = new Document("_id", id);
        when(schedulerRepository.findById(id)).thenReturn(existing);

        schedulerService.delete(id.toHexString());

        verify(schedulerRepository, times(1)).delete(id);
    }

    @Test
    void schedulerDeleteShouldThrowWhenNotFound() {
        ObjectId id = new ObjectId();
        when(schedulerRepository.findById(id)).thenReturn(null);

        assertThrows(AppointmentNotFoundException.class,
                () -> schedulerService.delete(id.toHexString()));
    }

    @Test
    void schedulerGetByIdShouldReturnDocumentWithHexId() {
        ObjectId id = new ObjectId();
        Document doc = new Document("_id", id).append("doctorId", "D001");
        when(schedulerRepository.findById(id)).thenReturn(doc);

        Document result = schedulerService.getById(id.toHexString());

        assertNotNull(result);
        assertEquals(id.toHexString(), result.getString("id"));
    }

    @Test
    void schedulerGetAllShouldDelegateToRepository() {
        Document d1 = new Document("doctorId", "D001");
        when(schedulerRepository.findAll()).thenReturn(List.of(d1));

        List<Document> result = schedulerService.getAll();

        assertEquals(1, result.size());
        verify(schedulerRepository, times(1)).findAll();
    }

    // ─── ArgumentCaptor sanity-check ────────────────────────────────────────

    @Test
    void createShouldPassCorrectDocumentToRepository() {
        when(numberGenerator.generate()).thenReturn("APPT-X");

        Document appt = new Document("patientName", "Test Patient")
                .append("appointmentDate", "2026-03-20");

        appointmentService.create(appt);

        ArgumentCaptor<Document> captor = ArgumentCaptor.forClass(Document.class);
        verify(appointmentRepository).save(captor.capture());

        Document saved = captor.getValue();
        assertEquals("Test Patient", saved.getString("patientName"));
        assertEquals("APPT-X", saved.getString("appointmentNumber"));
    }
}

