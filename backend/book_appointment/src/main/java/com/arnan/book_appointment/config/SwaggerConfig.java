
package com.arnan.book_appointment.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI appointmentOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Book Appointment API")
                        .description("API for booking, updating, cancelling appointments")
                        .version("1.0"));
    }
}
