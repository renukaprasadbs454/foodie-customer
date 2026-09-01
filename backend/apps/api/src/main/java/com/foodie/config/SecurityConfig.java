package com.foodie.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.dto.ApiResponse;
import com.foodie.common.exception.ErrorCode;
import com.foodie.security.jwt.JwtAuthFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Public auth routes + JWT filter (Phase3 §5.7).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, ObjectMapper objectMapper) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> {
                })
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/api/v1/auth/**",
                                "/api/v1/payments/webhook/razorpay",
                                "/api/v1/storage/**",
                                "/api/v1/debug/**")
                        .permitAll()
                        .requestMatchers("/api/v1/restaurants/me", "/api/v1/restaurants/me/**")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/restaurants",
                                "/api/v1/restaurants/*")
                        .permitAll()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/restaurants/*/reviews")
                        .permitAll()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/menu/categories")
                        .authenticated()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/menu/**")
                        .permitAll()
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/v1/search/**")
                        .permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                writeError(
                                        response,
                                        HttpServletResponse.SC_UNAUTHORIZED,
                                        ErrorCode.UNAUTHORIZED,
                                        "Authentication required."))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                writeError(
                                        response,
                                        HttpServletResponse.SC_FORBIDDEN,
                                        ErrorCode.FORBIDDEN,
                                        "Access denied.")))
                .addFilterBefore(
                        jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeError(
            HttpServletResponse response,
            int status,
            ErrorCode code,
            String message) throws java.io.IOException {

        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        objectMapper.writeValue(
                response.getOutputStream(),
                ApiResponse.failure(code, message));
    }
}
