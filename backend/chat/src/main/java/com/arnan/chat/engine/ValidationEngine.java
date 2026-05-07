package com.arnan.chat.engine;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

@Component
public class ValidationEngine {

    public void validate(Map<String,Object> step,
                         Map<String,Object> ctx,
                         String input) {

        Map<String,Object> v =
            (Map<String,Object>) step.get("validate");

        if (v == null) return;
        
     // ✅ DO NOT cast directly to List<String>
        List<Object> rawAllowed =
            (List<Object>) v.get("values");
        
     // ✅ normalize to String
        List<String> allowed = rawAllowed.stream()
                .map(Object::toString)
                .map(String::trim)
                .toList();

      //  List<String> allowed =(List<String>) v.get("values");

        if (!allowed.contains(input)) {
            int retries = (int) ctx.getOrDefault("_retry", 0) + 1;
            ctx.put("_retry", retries);

            if (retries >= (int) v.get("maxRetries")) {
                throw new RuntimeException("Max retries reached");
            }
            throw new IllegalArgumentException("Invalid input");
        }

        ctx.remove("_retry");
    }
}

