package com.foodie.infrastructure.storage;

import java.io.InputStream;
import java.time.Duration;

/**
 * S3/R2 adapter boundary (Phase3 §9.5). Modules depend on this interface only.
 */
public interface ObjectStorageClient {

    /**
     * Persist object bytes under {@code key}. Bucket is never public-read.
     */
    void putObject(String key, InputStream content, long contentLength, String contentType);

    /**
     * Retrieve exact object bytes.
     */
    byte[] getObject(String key);

    /**
     * Short-lived signed URL for private retrieval.
     */
    String createSignedGetUrl(String key, Duration ttl);
}
