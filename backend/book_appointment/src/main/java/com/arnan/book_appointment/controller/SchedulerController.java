package com.arnan.book_appointment.controller;

import com.arnan.book_appointment.service.SchedulerService;
import org.bson.Document;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Iterator;

@RestController
@RequestMapping("/api/schedulers")
public class SchedulerController {

	private final SchedulerService schedulerService;

	public SchedulerController(SchedulerService schedulerService) {
		this.schedulerService = schedulerService;
	}

	private Document toDocument(Object payload) {
		if (payload == null) return new Document();
		if (payload instanceof Document) return (Document) payload;
		if (payload instanceof Map) return new Document((Map) payload);
		if (payload instanceof String) {
			try {
				return Document.parse((String) payload);
			} catch (Exception e) {
				return new Document("value", payload);
			}
		}
		return new Document("value", payload.toString());
	}

	@PostMapping
	public ResponseEntity<Document> create(@RequestBody Object schedulerPayload) {
		Document scheduler = toDocument(schedulerPayload);
		return ResponseEntity.ok(schedulerService.create(scheduler));
	}

	@PutMapping("/{id}")
	public ResponseEntity<Document> update(@PathVariable String id, @RequestBody Object schedulerPayload) {
		Document scheduler = toDocument(schedulerPayload);
		return ResponseEntity.ok(schedulerService.update(id, scheduler));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable String id) {
		schedulerService.delete(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/{id}")
	public ResponseEntity<Document> getById(@PathVariable String id) {
		return ResponseEntity.ok(schedulerService.getById(id));
	}

	@GetMapping
	public ResponseEntity<List<Document>> getAll() {
		return ResponseEntity.ok(schedulerService.getAll());
	}

	/**
	 * Return schedulers but only include slots that were created by the supplied user id.
	 * This filters both top-level `daySlots` and `resourceSchedules[].daySlots`.
	 */
	@GetMapping("/by-creator")
	public ResponseEntity<List<Document>> getAllByCreator(@RequestParam String createdBy) {

		if (createdBy == null || createdBy.isEmpty()) {
			return ResponseEntity.ok(schedulerService.getAll());
		}

		return ResponseEntity.ok(schedulerService.getAllByCreator(createdBy));
	}

	private boolean slotCreatedBy(Document slot, String createdBy) {
		if (slot == null) return false;
		Object cb = slot.get("createdBy");
		if (cb == null) cb = slot.get("createdById");
		if (cb == null) cb = slot.get("userId");
		if (cb == null) cb = slot.get("creator");
		if (cb == null) cb = slot.get("createdByUserId");

		if (cb instanceof Document) {
			Document d = (Document) cb;
			Object id = d.get("id");
			if (id == null) id = d.get("_id");
			if (id != null) return createdBy.equals(String.valueOf(id));
		}

		return cb != null && createdBy.equals(String.valueOf(cb));
	}

	@DeleteMapping("/{schedulerId}/resource/{resourceId}/slot/{slotId}")
	public ResponseEntity<?> deleteSlot(

			@PathVariable String schedulerId,

			@PathVariable String resourceId,

			@PathVariable String slotId,

			@RequestParam(required = false) String date) {

		// If a date is provided, delete only the slot instance for that date.
		schedulerService.deleteSlot(schedulerId, resourceId, slotId, date);

		return ResponseEntity.ok().build();
	}

	@DeleteMapping("/{schedulerId}/resource/{resourceId}")
	public ResponseEntity<?> deleteResourceSchedule(

			@PathVariable String schedulerId,

			@PathVariable String resourceId) {

		schedulerService.deleteResourceSchedule(schedulerId, resourceId);

		return ResponseEntity.ok().build();
	}

	@PostMapping("/delete-multiple-slots")
	public ResponseEntity<?> deleteMultipleSlots(@RequestBody Map<String, List<Map<String, String>>> body) {

		schedulerService.deleteMultipleSlots(body.get("slots"));

		return ResponseEntity.ok().build();
	}
}