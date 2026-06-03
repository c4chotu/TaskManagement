package com.taskflow.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jackson2ObjectMapperBuilderCustomizer() {
        return builder -> builder.deserializerByType(Instant.class, new JsonDeserializer<Instant>() {
            @Override
            public Instant deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
                String text = p.getText().trim();
                if (text.isEmpty()) {
                    return null;
                }
                try {
                    // Try parsing as ISO-8601 Instant first
                    return Instant.parse(text);
                } catch (DateTimeParseException e) {
                    try {
                        // Fallback: Try parsing as LocalDate (yyyy-MM-dd)
                        return LocalDate.parse(text).atStartOfDay(ZoneOffset.UTC).toInstant();
                    } catch (DateTimeParseException ex) {
                        throw new IOException("Failed to deserialize Instant from string: " + text, ex);
                    }
                }
            }
        });
    }
}
