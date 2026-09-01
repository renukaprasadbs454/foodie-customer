package com.foodie.infrastructure.storage;

import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import java.util.Locale;
import java.util.Set;

/**
 * Magic-byte MIME validation for restaurant/delivery documents (pdf, jpeg, png).
 */
public final class DocumentMagicBytes {

    private static final Set<String> ALLOWED = Set.of("application/pdf", "image/jpeg", "image/png");

    private DocumentMagicBytes() {
    }

    public static DetectedDocument detect(byte[] header, String declaredContentType) {
        String actual = sniff(header);
        if (actual == null || !ALLOWED.contains(actual)) {
            throw new BadRequestException(ErrorCode.INVALID_FILE_TYPE, "Allowed document types: pdf, jpeg, png.");
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
        return new DetectedDocument(actual, extensionFor(actual));
    }

    private static boolean compatibleJpeg(String declared, String actual) {
        return "image/jpeg".equals(actual) && ("image/jpg".equals(declared) || "image/jpeg".equals(declared));
    }

    private static String sniff(byte[] header) {
        if (header == null || header.length < 5) {
            return null;
        }
        if (header[0] == '%' && header[1] == 'P' && header[2] == 'D' && header[3] == 'F' && header[4] == '-') {
            return "application/pdf";
        }
        if (header.length >= 12) {
            if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
                return "image/jpeg";
            }
            if ((header[0] & 0xFF) == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) {
                return "image/png";
            }
        }
        return null;
    }

    private static String extensionFor(String mime) {
        return switch (mime) {
            case "application/pdf" -> "pdf";
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            default -> "bin";
        };
    }

    public record DetectedDocument(String contentType, String extension) {
    }
}
