package com.foodie.infrastructure.storage;

import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import java.util.Locale;
import java.util.Set;

/**
 * Magic-byte MIME validation for profile/menu images (API File Upload Standards).
 */
public final class ImageMagicBytes {

    private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/webp");

    private ImageMagicBytes() {
    }

    public static DetectedImage detect(byte[] header, String declaredContentType) {
        String actual = sniff(header);
        if (actual == null || !ALLOWED.contains(actual)) {
            throw new BadRequestException(ErrorCode.INVALID_FILE_TYPE, "Allowed image types: jpeg, png, webp.");
        }
        if (declaredContentType != null && !declaredContentType.isBlank()) {
            String normalized = declaredContentType.toLowerCase(Locale.ROOT).split(";")[0].trim();
            if (!normalized.isEmpty() && !actual.equals(normalized) && !compatibleJpeg(normalized, actual)) {
                throw new BadRequestException(
                        ErrorCode.FILE_CONTENT_MISMATCH,
                        "Declared Content-Type does not match file bytes."
                );
            }
        }
        return new DetectedImage(actual, extensionFor(actual));
    }

    private static boolean compatibleJpeg(String declared, String actual) {
        return "image/jpeg".equals(actual) && ("image/jpg".equals(declared) || "image/jpeg".equals(declared));
    }

    private static String sniff(byte[] header) {
        if (header == null || header.length < 12) {
            return null;
        }
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if ((header[0] & 0xFF) == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) {
            return "image/png";
        }
        // RIFF....WEBP
        if (header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    private static String extensionFor(String mime) {
        return switch (mime) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "bin";
        };
    }

    public record DetectedImage(String contentType, String extension) {
    }
}
