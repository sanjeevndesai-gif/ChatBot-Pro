package com.arnan.gateway;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.reactive.server.SecurityMockServerConfigurers.mockJwt;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "eureka.client.enabled=false",
                "eureka.client.register-with-eureka=false",
                "eureka.client.fetch-registry=false",
                "spring.cloud.discovery.enabled=false",
                "spring.cloud.gateway.discovery.locator.enabled=false",
                "oauth2.jwt.secret=test-jwt-secret-for-gateway-tests-32-chars!!"
        }
)
@AutoConfigureWebTestClient
class GatewayApplicationTests {

    @Autowired
    WebTestClient webTestClient;

    @Autowired
    ReactiveJwtDecoder jwtDecoder;

    @Autowired
    SecurityWebFilterChain securityWebFilterChain;

    // ─────────────────────────────────────────────
    // Context
    // ─────────────────────────────────────────────

    @Test
    void contextLoads() {
        assertNotNull(webTestClient);
    }

    // ─────────────────────────────────────────────
    // Bean creation
    // ─────────────────────────────────────────────

    @Test
    void jwtDecoderBeanShouldNotBeNull() {
        assertNotNull(jwtDecoder);
    }

    @Test
    void securityWebFilterChainBeanShouldNotBeNull() {
        assertNotNull(securityWebFilterChain);
    }

    // ─────────────────────────────────────────────
    // Permitted paths (no auth required)
    // ─────────────────────────────────────────────

    @Test
    void optionsEndpointShouldBePermittedWithoutAuthentication() {
        webTestClient
                .options().uri("/chat/messages")
                .exchange()
                .expectStatus().value(status -> assertThat(status).isNotEqualTo(401));
    }

    @Test
    void actuatorEndpointShouldBePermittedWithoutAuthentication() {
        webTestClient
                .get().uri("/actuator/health")
                .exchange()
                .expectStatus().value(status -> assertThat(status).isNotEqualTo(401));
    }

    @Test
    void postToAuthServiceShouldBePermittedWithoutAuthentication() {
        webTestClient
                .post().uri("/auth/auth-service")
                .exchange()
                .expectStatus().value(status -> assertThat(status).isNotEqualTo(401));
    }

    @Test
    void postToAuthServiceLoginShouldBePermittedWithoutAuthentication() {
        webTestClient
                .post().uri("/auth/auth-service/login")
                .exchange()
                .expectStatus().value(status -> assertThat(status).isNotEqualTo(401));
    }

    @Test
    void postToOauth2TokenShouldBePermittedWithoutAuthentication() {
        webTestClient
                .post().uri("/auth/oauth2/token")
                .exchange()
                .expectStatus().value(status -> assertThat(status).isNotEqualTo(401));
    }

    // ─────────────────────────────────────────────
    // Protected paths (auth required)
    // ─────────────────────────────────────────────

    @Test
    void protectedChatEndpointShouldReturn401WithoutToken() {
        webTestClient
                .get().uri("/chat/messages")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void protectedBookEndpointShouldReturn401WithoutToken() {
        webTestClient
                .get().uri("/book/appointments")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    void protectedI18nEndpointShouldReturn401WithoutToken() {
        webTestClient
                .get().uri("/i18n/translations")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    // ─────────────────────────────────────────────
    // JWT bearer token passes security filter
    // ─────────────────────────────────────────────

    @Test
    void chatEndpointWithValidJwtShouldPassSecurityFilter() {
        webTestClient
                .mutateWith(mockJwt())
                .get().uri("/chat/messages")
                .exchange()
                .expectStatus().value(status -> assertThat(status).isNotEqualTo(401));
    }

    @Test
    void bookEndpointWithValidJwtShouldPassSecurityFilter() {
        webTestClient
                .mutateWith(mockJwt())
                .get().uri("/book/appointments")
                .exchange()
                .expectStatus().value(status -> assertThat(status).isNotEqualTo(401));
    }

    @Test
    void i18nEndpointWithValidJwtShouldPassSecurityFilter() {
        webTestClient
                .mutateWith(mockJwt())
                .get().uri("/i18n/translations")
                .exchange()
                .expectStatus().value(status -> assertThat(status).isNotEqualTo(401));
    }
}
