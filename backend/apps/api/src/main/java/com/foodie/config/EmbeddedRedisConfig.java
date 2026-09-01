package com.foodie.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import redis.embedded.RedisServer;

/**
 * Starts an in-process Redis server for local/dev so no external Redis install
 * is needed.
 * Only active on the 'local' and 'dev' Spring profiles.
 */
@Configuration
@Profile({ "local", "dev" })
public class EmbeddedRedisConfig {

    private static final Logger log = LoggerFactory.getLogger(EmbeddedRedisConfig.class);

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    private RedisServer redisServer;

    @PostConstruct
    public void startRedis() {
        try {
            redisServer = redis.embedded.RedisServer.builder()
                    .port(redisPort)
                    .setting("maxheap 128M")
                    .build();
            redisServer.start();
            log.info("Embedded Redis started on port {}", redisPort);
        } catch (Exception ex) {
            // If Redis is already running externally, log a warning and continue
            log.warn("Could not start embedded Redis on port {} — a Redis instance may already be running: {}",
                    redisPort, ex.getMessage());
        }
    }

    @PreDestroy
    public void stopRedis() {
        if (redisServer != null) {
            try {
                redisServer.stop();
                log.info("Embedded Redis stopped.");
            } catch (Exception ex) {
                log.warn("Error stopping embedded Redis: {}", ex.getMessage());
            }
        }
    }
}
