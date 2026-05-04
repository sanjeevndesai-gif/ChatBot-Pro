package com.arnan.userservice.service;

import com.arnan.userservice.entity.AppUser;
import com.arnan.userservice.entity.PageResponse;
import com.arnan.userservice.exception.ServiceException;
import com.arnan.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.bson.Document;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

	private final UserRepository userRepository;

	// Extract tenant from JWT (set in JwtFilter)
	private String getRegistrationId() {
		return (String) SecurityContextHolder.getContext().getAuthentication().getDetails();
	}

	// Extract adminId from JWT
	private String getAdminId() {
		return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
	}

	// CREATE USER
	public AppUser createUser(Map<String, Object> payload) {

		String regId = getRegistrationId();
		String adminId = getAdminId();

		AppUser user = new AppUser();
		user.setRegistrationId(regId);
		user.setCreatedBy(adminId);
		user.setPayload(payload);
		user.setCreatedAt(Instant.now());

		userRepository.save(user);

		log.info("User created for tenant {}", regId);

		return user;
	}

	// GET ALL USERS (Tenant Isolated)
//    public List<AppUser> getUsers() {
//
//        String regId = getRegistrationId();
//
//        log.info("Fetching users for tenant {}", regId);
//
//        return userRepository.findByRegistrationId(regId);
//    }
	private final MongoTemplate mongoTemplate;

	public PageResponse<AppUser> getUsers(int page, int size, String search, String sort, String filters) {

		String regId = getRegistrationId();

		Query query = new Query();
		query.addCriteria(Criteria.where("registrationId").is(regId));

		/* -------------------- SEARCH -------------------- */
		if (search != null && !search.isBlank()) {

			Criteria payloadSearch = Criteria.where("$expr")
					.is(new Document("$regexMatch", new Document("input", new Document("$toString", "$payload"))
							.append("regex", search).append("options", "i")));

			query.addCriteria(payloadSearch);
		}

		/* -------------------- FILTERS -------------------- */
		if (filters != null && !filters.isBlank()) {

			String[] filterPairs = filters.split(",");

			for (String pair : filterPairs) {
				String[] keyValue = pair.split(":");

				if (keyValue.length == 2) {
					String key = keyValue[0];
					String value = keyValue[1];

					query.addCriteria(Criteria.where("payload." + key).regex("^" + value + "$", "i"));
				}
			}
		}

		/* -------------------- SORTING -------------------- */
		if (sort != null && !sort.isBlank()) {

			String[] sortParts = sort.split(",");

			if (sortParts.length == 2) {

				String field = sortParts[0];
				String direction = sortParts[1];

				Sort.Direction dir = direction.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;

				query.with(Sort.by(dir, field));
			}
		} else {
			query.with(Sort.by(Sort.Direction.DESC, "createdAt"));
		}

		/* -------------------- PAGINATION -------------------- */
		long total = mongoTemplate.count(query, AppUser.class);

		Pageable pageable = PageRequest.of(page, size);
		query.with(pageable);

		List<AppUser> users = mongoTemplate.find(query, AppUser.class);

		int totalPages = (int) Math.ceil((double) total / size);

		return new PageResponse<>(users, total, totalPages, page, size);
	}

	// GET SINGLE USER
	public AppUser getUser(String id) {

		String regId = getRegistrationId();

		return userRepository.findByIdAndRegistrationId(id, regId)
				.orElseThrow(() -> new ServiceException("User not found", 404));
	}

	// UPDATE USER
	public AppUser updateUser(String id, Map<String, Object> payload) {

		AppUser user = getUser(id);

		// Prevent dangerous fields inside payload
		payload.remove("_id");
		payload.remove("registrationId");
		payload.remove("createdBy");
		payload.remove("createdAt");

		user.setPayload(payload);
		user.setUpdatedAt(Instant.now());

		userRepository.save(user);

		log.info("User {} updated for tenant {}", id, user.getRegistrationId());

		return user;
	}

	// DELETE USER
	public Map<String, String> deleteUser(String id) {

		AppUser user = getUser(id);

		userRepository.delete(user);

		log.info("User {} deleted for tenant {}", id, user.getRegistrationId());

		return Map.of("message", "User deleted successfully");
	}
}