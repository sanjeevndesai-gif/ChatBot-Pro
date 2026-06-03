package com.arnan.book_appointment.service;

import com.arnan.book_appointment.entity.DaySlot;
import com.arnan.book_appointment.entity.Scheduler;
import com.arnan.book_appointment.exception.AppointmentNotFoundException;
import com.arnan.book_appointment.repository.SchedulerRepository;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class SchedulerService {
	final SchedulerRepository repository;

	public SchedulerService(SchedulerRepository repository) {
		this.repository = repository;
	}

	public Document create(Document scheduler) {

		scheduler.put("createdAt", LocalDateTime.now());
		scheduler.put("updatedAt", LocalDateTime.now());

		repository.save(scheduler);

		ObjectId id = scheduler.getObjectId("_id");
		if (id != null) {
			scheduler.put("id", id.toHexString());
		}

		return scheduler;
	}

	public Document update(String id, Document scheduler) {

		Document existing = repository.findById(new ObjectId(id));

		if (existing == null)
			throw new AppointmentNotFoundException("Scheduler not found");

		scheduler.put("createdAt", existing.get("createdAt"));
		scheduler.put("updatedAt", LocalDateTime.now());

		repository.update(scheduler, new ObjectId(id));

		scheduler.put("id", id);

		return scheduler;
	}

	public void delete(String id) {

		Document existing = repository.findById(new ObjectId(id));

		if (existing == null)
			throw new AppointmentNotFoundException("Scheduler not found");

		repository.delete(new ObjectId(id));
	}

	public Document getById(String id) {

		Document doc = repository.findById(new ObjectId(id));

		if (doc == null)
			throw new AppointmentNotFoundException("Scheduler not found");

		ObjectId objectId = doc.getObjectId("_id");
		if (objectId != null) {
			doc.put("id", objectId.toHexString());
		}

		return doc;
	}

//    public List<Document> getAll() {
//        return repository.findAll();
//    }

	public List<Document> getAll() {

		List<Document> schedulers = repository.findAll();

		for (Document doc : schedulers) {

			ObjectId objectId = doc.getObjectId("_id");

			if (objectId != null) {

				doc.put("id", objectId.toHexString());
			}
		}

		return schedulers;
	}

	@SuppressWarnings("unchecked")
	public void deleteSlot(String schedulerId, String resourceId, String slotId) {

		Document scheduler = repository.findById(new ObjectId(schedulerId));

		if (scheduler == null) {

			throw new RuntimeException("Scheduler not found");
		}

		List<?> resourceSchedules = (List<?>) scheduler.get("resourceSchedules");

		if (resourceSchedules == null)
			return;

		for (Object rsObj : resourceSchedules) {

			Document resourceSchedule = new Document((java.util.Map<String, Object>) rsObj);

			String dbResourceId = resourceSchedule.getString("resourceId");

			if (!resourceId.equals(dbResourceId)) {
				continue;
			}

			List<?> daySlots = (List<?>) resourceSchedule.get("daySlots");

			if (daySlots == null)
				continue;

			for (Object dayObj : daySlots) {

				Document day = new Document((java.util.Map<String, Object>) dayObj);

				List<?> slots = (List<?>) day.get("slots");

				if (slots == null)
					continue;

				slots.removeIf(slotObj -> {

					Document slot = new Document((java.util.Map<String, Object>) slotObj);

					return slotId.equals(slot.getString("slotId"));
				});
			}
		}

		repository.update(scheduler, new ObjectId(schedulerId));
	}

	@SuppressWarnings("unchecked")
	public void deleteResourceSchedule(String schedulerId, String resourceId) {

		Document scheduler = repository.findById(new ObjectId(schedulerId));

		if (scheduler == null) {

			throw new RuntimeException("Scheduler not found");
		}

		List<Document> resourceSchedules = (List<Document>) scheduler.get("resourceSchedules");

		if (resourceSchedules == null)
			return;

		resourceSchedules.removeIf(resource ->

		resourceId.equals(resource.getString("resourceId")));

		// IMPORTANT
		// if no resources left
		// delete whole scheduler
		if (resourceSchedules.isEmpty()) {

			repository.delete(new ObjectId(schedulerId));

			return;
		}

		scheduler.put("updatedAt", LocalDateTime.now());

		repository.update(scheduler, new ObjectId(schedulerId));
	}

	@SuppressWarnings("unchecked")
	public void deleteMultipleSlots(List<Map<String, String>> slotsToDelete) {

		List<Document> schedulers = repository.findAll();

		for (Document scheduler : schedulers) {

			String schedulerId = scheduler.getObjectId("_id").toHexString();

			List<Document> resourceSchedules = (List<Document>) scheduler.get("resourceSchedules");

			if (resourceSchedules == null)
				continue;

			for (Document resource : resourceSchedules) {

				String resourceId = resource.getString("resourceId");

				List<Document> daySlots = (List<Document>) resource.get("daySlots");

				if (daySlots == null)
					continue;

				for (Document day : daySlots) {

					List<Document> slots = (List<Document>) day.get("slots");

					if (slots == null)
						continue;

					slots.removeIf(slot ->

					slotsToDelete.stream().anyMatch(selected ->

					schedulerId.equals(selected.get("schedulerId"))

							&&

							resourceId.equals(selected.get("resourceId"))

							&&

							slot.getString("slotId").equals(selected.get("slotId"))));
				}
			}

			repository.update(scheduler, scheduler.getObjectId("_id"));
		}
	}
}