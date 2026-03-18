package com.arnan.i18n;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.arnan.i18n.exception.NotFoundException;
import com.arnan.i18n.repository.LabelRepository;
import com.arnan.i18n.service.LabelService;

@ExtendWith(MockitoExtension.class)
class I18nServiceApplicationTests {

    @Mock
    LabelRepository labelRepository;

    @InjectMocks
    LabelService labelService;

    // ─────────────────────────────────────────────
    // contextLoads
    // ─────────────────────────────────────────────

    @Test
    void contextLoads() {
        assertNotNull(labelService);
    }

    // ─────────────────────────────────────────────
    // getAll
    // ─────────────────────────────────────────────

    @Test
    void getAllShouldReturnAllLabels() {
        when(labelRepository.findAll()).thenReturn(List.of(
                Map.of("key", "btn.ok", "locale", "en", "value", "OK"),
                Map.of("key", "btn.ok", "locale", "ar", "value", "موافق")));

        List<Map<String, Object>> result = labelService.getAll();

        assertEquals(2, result.size());
        verify(labelRepository, times(1)).findAll();
    }

    // ─────────────────────────────────────────────
    // getById
    // ─────────────────────────────────────────────

    @Test
    void getByIdShouldReturnLabelWhenFound() {
        Map<String, Object> label = Map.of("id", "abc123", "key", "btn.ok", "locale", "en", "value", "OK");
        when(labelRepository.findById("abc123")).thenReturn(Optional.of(label));

        Map<String, Object> result = labelService.getById("abc123");

        assertNotNull(result);
        assertEquals("OK", result.get("value"));
    }

    @Test
    void getByIdShouldThrowNotFoundWhenMissing() {
        when(labelRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> labelService.getById("missing"));
    }

    // ─────────────────────────────────────────────
    // getByKeyAndLocale
    // ─────────────────────────────────────────────

    @Test
    void getByKeyAndLocaleShouldReturnLabel() {
        Map<String, Object> label = Map.of("key", "btn.ok", "locale", "en", "value", "OK");
        when(labelRepository.findByKeyAndLocale("btn.ok", "en")).thenReturn(Optional.of(label));

        Map<String, Object> result = labelService.getByKeyAndLocale("btn.ok", "en");

        assertEquals("OK", result.get("value"));
    }

    @Test
    void getByKeyAndLocaleNormalisesLocaleToLowerCase() {
        Map<String, Object> label = Map.of("key", "btn.ok", "locale", "en", "value", "OK");
        when(labelRepository.findByKeyAndLocale("btn.ok", "en")).thenReturn(Optional.of(label));

        // Provide mixed-case locale — service should normalise to lower-case
        Map<String, Object> result = labelService.getByKeyAndLocale("btn.ok", "EN");

        assertEquals("OK", result.get("value"));
        verify(labelRepository).findByKeyAndLocale("btn.ok", "en");
    }

    @Test
    void getByKeyAndLocaleShouldThrowNotFoundWhenMissing() {
        when(labelRepository.findByKeyAndLocale(anyString(), anyString())).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> labelService.getByKeyAndLocale("missing.key", "en"));
    }

    // ─────────────────────────────────────────────
    // getByLocale
    // ─────────────────────────────────────────────

    @Test
    void getByLocaleShouldReturnLabelsForLocale() {
        when(labelRepository.findByLocale("ar")).thenReturn(
                List.of(Map.of("key", "btn.ok", "locale", "ar", "value", "موافق")));

        List<Map<String, Object>> result = labelService.getByLocale("ar");

        assertEquals(1, result.size());
        assertEquals("ar", result.get(0).get("locale"));
    }

    // ─────────────────────────────────────────────
    // getByNamespace
    // ─────────────────────────────────────────────

    @Test
    void getByNamespaceShouldDelegate() {
        when(labelRepository.findByNamespace("common")).thenReturn(List.of(
                Map.of("key", "common.submit", "namespace", "common", "value", "Submit")));

        List<Map<String, Object>> result = labelService.getByNamespace("common");

        assertEquals(1, result.size());
        verify(labelRepository, times(1)).findByNamespace("common");
    }

    // ─────────────────────────────────────────────
    // translateNamespace
    // ─────────────────────────────────────────────

    @Test
    void translateNamespaceShouldReturnFlatKeyValueMap() {
        when(labelRepository.findByNamespaceAndLocale("common", "en")).thenReturn(List.of(
                Map.of("key", "common.submit", "value", "Submit"),
                Map.of("key", "common.cancel", "value", "Cancel")));

        Map<String, String> result = labelService.translateNamespace("common", "en");

        assertEquals(2, result.size());
        assertEquals("Submit", result.get("common.submit"));
        assertEquals("Cancel", result.get("common.cancel"));
    }

    // ─────────────────────────────────────────────
    // create
    // ─────────────────────────────────────────────

    @Test
    void createShouldPersistLabel() {
        when(labelRepository.existsByKeyAndLocale("btn.ok", "en")).thenReturn(false);
        when(labelRepository.save(any())).thenAnswer(inv -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>(inv.getArgument(0));
            m.put("id", "new-id");
            return m;
        });

        Map<String, Object> input = new java.util.LinkedHashMap<>();
        input.put("key", "btn.ok");
        input.put("locale", "en");
        input.put("value", "OK");

        Map<String, Object> result = labelService.create(input);

        assertNotNull(result);
        verify(labelRepository, times(1)).save(any());
    }

    @Test
    void createShouldThrowWhenDuplicateKeyLocale() {
        when(labelRepository.existsByKeyAndLocale("btn.ok", "en")).thenReturn(true);

        Map<String, Object> input = new java.util.LinkedHashMap<>();
        input.put("key", "btn.ok");
        input.put("locale", "en");
        input.put("value", "OK");

        assertThrows(RuntimeException.class, () -> labelService.create(input));
        verify(labelRepository, never()).save(any());
    }

    @Test
    void createShouldThrowWhenKeyIsBlank() {
        Map<String, Object> input = new java.util.LinkedHashMap<>();
        input.put("key", "  ");
        input.put("locale", "en");
        input.put("value", "OK");

        assertThrows(RuntimeException.class, () -> labelService.create(input));
    }

    @Test
    void createShouldThrowWhenValueIsBlank() {
        Map<String, Object> input = new java.util.LinkedHashMap<>();
        input.put("key", "btn.ok");
        input.put("locale", "en");
        input.put("value", "");

        assertThrows(RuntimeException.class, () -> labelService.create(input));
    }

    // ─────────────────────────────────────────────
    // update
    // ─────────────────────────────────────────────

    @Test
    void updateShouldModifyExistingLabel() {
        String id = "existing-id";
        Map<String, Object> existing = new java.util.LinkedHashMap<>();
        existing.put("id", id);
        existing.put("key", "btn.ok");
        existing.put("locale", "en");
        existing.put("value", "OK");

        when(labelRepository.findById(id)).thenReturn(Optional.of(existing));
        when(labelRepository.existsByKeyAndLocaleExcludingId("btn.ok", "en", id)).thenReturn(false);
        when(labelRepository.update(eq(id), any())).thenAnswer(inv -> inv.getArgument(1));

        Map<String, Object> update = new java.util.LinkedHashMap<>();
        update.put("key", "btn.ok");
        update.put("locale", "en");
        update.put("value", "Okay");

        Map<String, Object> result = labelService.update(id, update);

        assertEquals("Okay", result.get("value"));
        verify(labelRepository, times(1)).update(eq(id), any());
    }

    @Test
    void updateShouldThrowWhenLabelNotFound() {
        when(labelRepository.findById("ghost")).thenReturn(Optional.empty());

        Map<String, Object> update = new java.util.LinkedHashMap<>();
        update.put("key", "x");
        update.put("locale", "en");
        update.put("value", "y");

        assertThrows(NotFoundException.class, () -> labelService.update("ghost", update));
    }

    // ─────────────────────────────────────────────
    // delete
    // ─────────────────────────────────────────────

    @Test
    void deleteShouldRemoveLabelById() {
        when(labelRepository.existsById("del-id")).thenReturn(true);

        labelService.delete("del-id");

        verify(labelRepository, times(1)).deleteById("del-id");
    }

    @Test
    void deleteShouldThrowWhenLabelNotFound() {
        when(labelRepository.existsById("ghost")).thenReturn(false);

        assertThrows(NotFoundException.class, () -> labelService.delete("ghost"));
        verify(labelRepository, never()).deleteById(any());
    }

    // ─────────────────────────────────────────────
    // bulkUpsert
    // ─────────────────────────────────────────────

    @Test
    void bulkUpsertShouldCreateNewLabels() {
        when(labelRepository.findByKeyAndLocale(anyString(), anyString())).thenReturn(Optional.empty());
        when(labelRepository.save(any())).thenAnswer(inv -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>(inv.getArgument(0));
            m.put("id", "new-id");
            return m;
        });

        List<Map<String, Object>> labels = List.of(
                Map.of("key", "new.key", "locale", "en", "value", "New"),
                Map.of("key", "another.key", "locale", "en", "value", "Another"));

        List<Map<String, Object>> result = labelService.bulkUpsert(labels);

        assertEquals(2, result.size());
        verify(labelRepository, times(2)).save(any());
    }

    @Test
    void bulkUpsertShouldUpdateExistingLabels() {
        Map<String, Object> existing = new java.util.LinkedHashMap<>();
        existing.put("id", "exists-id");
        existing.put("key", "btn.ok");
        existing.put("locale", "en");
        existing.put("value", "OK");

        when(labelRepository.findByKeyAndLocale("btn.ok", "en")).thenReturn(Optional.of(existing));
        when(labelRepository.update(anyString(), any())).thenAnswer(inv -> inv.getArgument(1));

        List<Map<String, Object>> labels = List.of(
                Map.of("key", "btn.ok", "locale", "en", "value", "OK Updated"));

        List<Map<String, Object>> result = labelService.bulkUpsert(labels);

        assertEquals(1, result.size());
        verify(labelRepository, times(1)).update(eq("exists-id"), any());
    }
}

