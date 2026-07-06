---
name: "fix-double-booking"
description: "Audit an appointment endpoint for the BOOKED overlap guard. Use when adding or modifying any endpoint in book_appointment that creates or updates appointments."
argument-hint: "Controller method or file to audit (e.g. AppointmentController.java)"
agent: "agent"
tools: [search, read, edit]
---

You are auditing `book_appointment` service code for correct double-booking prevention.

## Rules to Enforce

A valid create/update path **must** check for an existing `BOOKED` appointment with:
- Same `doctorId`
- Same `appointmentDate`
- Overlapping time window: existing `timeFrom` < new `timeTo` AND existing `timeTo` > new `timeFrom`

On conflict, the code **must** throw `AppointmentConflictException`, which `GlobalExceptionHandler` maps to HTTP 409 with body:
```json
{ "error": "APPOINTMENT_CONFLICT", "message": "The selected time slot is already booked" }
```

## Audit Steps

1. **Locate the target method**
   - Read the file named in the argument (or search `book_appointment/src/` for `@PostMapping` and `@PutMapping` methods that write appointments).

2. **Check for the overlap query**
   - Find the MongoDB query that checks for conflicts before insert/update.
   - Verify it filters by `status = "BOOKED"`, `doctorId`, `appointmentDate`, and the time overlap condition above.
   - If using raw `MongoClient` / `MongoCollection<Document>`, confirm `Filters.and(...)` with `Filters.lt("timeFrom", newTimeTo)` and `Filters.gt("timeTo", newTimeFrom)`.

3. **Check exception handling**
   - Verify that a non-empty result throws `AppointmentConflictException` (not a generic exception).
   - Verify `GlobalExceptionHandler` has a handler for `AppointmentConflictException` that returns `ResponseEntity` with status 409 and the exact body above.

4. **Report findings**
   For each issue found, output:
   ```
   [FAIL] <file>:<line> — <description of what is missing or wrong>
   ```
   For each passing check:
   ```
   [PASS] <check name>
   ```

5. **Fix any failures**
   - Apply the minimal fix directly in the source file.
   - Do NOT change surrounding logic, imports, or unrelated methods.
   - After fixing, re-state the check as `[PASS]`.

6. **Summary**
   Print a one-line summary: `Audit complete — N issues found, N fixed.`
