package com.foodie.infrastructure.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.file.Path;
import java.nio.file.Files;
import java.io.IOException;

@RestController
@RequestMapping("/api/v1/storage")
public class LocalObjectStorageController {

    private final Path root;

    public LocalObjectStorageController(
            @Value("${foodie.storage.local-root:./.local-object-storage}") String localRoot) {
        this.root = Path.of(localRoot).toAbsolutePath().normalize();
    }

    @GetMapping("/**")
    public ResponseEntity<Resource> download(HttpServletRequest request) throws IOException {
        String path = (String) request
                .getAttribute(org.springframework.web.servlet.HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String bestMatchPattern = (String) request
                .getAttribute(org.springframework.web.servlet.HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String key = new org.springframework.util.AntPathMatcher().extractPathWithinPattern(bestMatchPattern, path);

        Path file = root.resolve(key).normalize();
        if (!file.startsWith(root) || !Files.exists(file)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file.toFile());
        String contentType = Files.probeContentType(file);
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.getFileName().toString() + "\"")
                .body(resource);
    }
}