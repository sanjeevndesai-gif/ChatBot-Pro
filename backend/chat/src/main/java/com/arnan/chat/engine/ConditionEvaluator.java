package com.arnan.chat.engine;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

@Component
public class ConditionEvaluator {

	public String resolve(Map<String, Object> step, Map<String, Object> ctx) {

		Object next = step.get("next");

		if (next instanceof String) {
			return next.toString();
		}

		if (next instanceof Map) {
			@SuppressWarnings("unchecked")
			Map<String, String> nextMap = (Map<String, String>) next;
			String choice = (String) ctx.get("menu_choice");
			return nextMap.get(choice);
		}

		if (next instanceof List) {
			@SuppressWarnings("unchecked")
			List<Map<String, String>> rules = (List<Map<String, String>>) next;
			for (Map<String, String> r : rules) {
				String when = r.get("when");
				if (when != null && when.contains("==")) {
					String[] parts = when.split("==", 2);
					String keyPath = parts[0].replace("context.", "").trim();
					String val = parts[1].replace("'", "").trim();
					// Resolve nested path: context.X.Y.Z
					Object ctxVal = resolveNestedPath(ctx, keyPath);
					if (val.equals(String.valueOf(ctxVal))) {
						return r.get("go");
					}
				}
			}
		}

		return null;
	}

	/**
	 * Resolves a dot-separated path against a Map context.
	 * e.g. "upcoming_appointment.found" → ctx["upcoming_appointment"]["found"]
	 */
	@SuppressWarnings("unchecked")
	public static Object resolveNestedPath(Map<String, Object> ctx, String path) {
		String[] parts = path.split("\\.");
		Object current = ctx;
		for (String part : parts) {
			if (!(current instanceof Map<?, ?> m)) return null;
			current = ((Map<String, Object>) m).get(part);
			if (current == null) return null;
		}
		return current;
	}
}

