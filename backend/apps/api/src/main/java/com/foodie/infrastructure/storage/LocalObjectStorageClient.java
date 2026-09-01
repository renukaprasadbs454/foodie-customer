package com.foodie.infrastructure.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Local filesystem storage for development. Swap for S3/R2 without touching
 * User module.
 */
@Component
public class LocalObjectStorageClient implements ObjectStorageClient {

    private static final Logger log = LoggerFactory.getLogger(LocalObjectStorageClient.class);

    private final Path root;

    public LocalObjectStorageClient(@Value("${foodie.storage.local-root:./.local-object-storage}") String localRoot) {
        this.root = Path.of(localRoot).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException ex) {
            throw new UncheckedIOException("Unable to create local object storage root", ex);
        }
    }

    @Override
    public void putObject(String key, InputStream content, long contentLength, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
            log.info("Stored object key={} bytes={} contentType={}", key, contentLength, contentType);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store object " + key, ex);
        }
    }

    @Override
    public byte[] getObject(String key) {
        Path target = resolve(key);
        try {
            return Files.readAllBytes(target);
        } catch (IOException ex) {
            return new byte[0];
        }
    }

    @Override
    public String createSignedGetUrl(String key, Duration ttl) {
        if (key != null && (key.startsWith("http://") || key.startsWith("https://"))) {
            return key;
        }
        return "/api/v1/storage/" + key;
    }

    private Path resolve(String key) {
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return resolved;
    }
}
