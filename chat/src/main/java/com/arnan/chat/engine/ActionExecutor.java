package com.arnan.chat.engine;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class ActionExecutor {

    private final RestTemplate rest;

    public ActionExecutor(RestTemplate rest) {
        this.rest = rest;
    }

    public void execute(Map<String,Object> step,
                        Map<String,Object> ctx) {

        Map<String,Object> action =
            (Map<String,Object>) step.get("action");

        if (action == null) return;

        if ("REST".equals(action.get("type"))) {
            String url = action.get("url").toString();
            ResponseEntity<Object> res =
                rest.getForEntity(url, Object.class);
            ctx.put(action.get("saveAs").toString(), res.getBody());
        }
    }
}

