package com.arnan.book_appointment.controller;

import com.arnan.book_appointment.service.SchedulerService;
import org.bson.Document;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schedulers")
public class SchedulerController {

	private final SchedulerService schedulerService;

	public SchedulerController(SchedulerService schedulerService) {
		this.schedulerService = schedulerService;
	}

	@PostMapping
	public ResponseEntity<Document> create(@RequestBody Document scheduler) {
		return ResponseEntity.ok(schedulerService.create(scheduler));
	}

	@PutMapping("/{id}")
	public ResponseEntity<Document> update(@PathVariable String id, @RequestBody Document scheduler) {
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