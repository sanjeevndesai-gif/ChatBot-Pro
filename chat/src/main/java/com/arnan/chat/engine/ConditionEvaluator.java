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
// Example: use a value from context to decide
			String choice = (String) ctx.get("menu_choice");
			return nextMap.get(choice);
		}

		if (next instanceof List) {
			@SuppressWarnings("unchecked")
			List<Map<String, String>> rules = (List<Map<String, String>>) next;
			for (Map<String, String> r : rules) {
				String when = r.get("when");
				if (when.contains("==")) {
					String[] parts = when.split("==");
					String key = parts[0].replace("context.", "").trim();
					String val = parts[1].replace("'", "").trim();
					if (val.equals(ctx.get(key))) {
						return r.get("go");
					}
				}
			}
		}

		return null;
	}

}
