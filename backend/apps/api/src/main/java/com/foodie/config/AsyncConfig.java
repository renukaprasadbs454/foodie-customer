package com.foodie.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables async event listeners. Thread-pool tuning is deferred until domain events land.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
