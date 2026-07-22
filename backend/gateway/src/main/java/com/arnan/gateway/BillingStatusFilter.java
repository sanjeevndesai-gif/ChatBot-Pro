package com.arnan.gateway;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

import reactor.core.publisher.Mono;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.core.io.buffer.DataBuffer;

@Component
public class BillingStatusFilter implements WebFilter {

    @Autowired
    private WebClient authWebClient;

    // Whitelist paths that must remain accessible to deactivated users
    private static final List<String> WHITELIST = List.of(
        "/billing",
        "/plans",
        "/auth",
        "/actuator"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        for (String w : WHITELIST) {
            if (path.startsWith(w)) {
                return chain.filter(exchange);
            }
        }

        return ReactiveSecurityContextHolder.getContext()
            .map(SecurityContext::getAuthentication)
            .flatMap(auth -> {
                if (auth instanceof JwtAuthenticationToken) {
                    Jwt jwt = ((JwtAuthenticationToken) auth).getToken();
                    String userId = jwt.getSubject();
                    if (userId == null) return chain.filter(exchange);

                    return authWebClient
                        .get()
                        .uri(uriBuilder -> uriBuilder.path("/billing/{id}").build(userId))
                        .retrieve()
                        .bodyToMono(Map.class)
                        .flatMap(body -> {
                            Object status = body.get("status");
                            if ("deactivated".equals(status)) {
                                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                                exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
                                byte[] bytes = "{\"message\":\"Account inactive - please renew plan\"}".getBytes(StandardCharsets.UTF_8);
                                DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
                                return exchange.getResponse().writeWith(Mono.just(buffer));
                            }
                            return chain.filter(exchange);
                        })
                        .onErrorResume(e -> chain.filter(exchange));
                }
                return chain.filter(exchange);
            })
            .switchIfEmpty(chain.filter(exchange));
    }
}
