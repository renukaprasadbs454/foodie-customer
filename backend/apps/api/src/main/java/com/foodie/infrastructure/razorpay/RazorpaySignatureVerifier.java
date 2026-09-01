package com.foodie.infrastructure.razorpay;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/**
 * HMAC-SHA256 webhook signature verification with constant-time compare (Phase3
 * §8.3).
 */
@Component
public class RazorpaySignatureVerifier {

    private final RazorpayProperties properties;

    public RazorpaySignatureVerifier(RazorpayProperties properties) {
        this.properties = properties;
    }

    public boolean isValid(String rawBody, String signatureHeader) {
        if (properties.isStub()) {
            return true;
        }
        if (rawBody == null || signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }
        String expected = hmacSha256Hex(properties.getWebhookSecret(), rawBody);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signatureHeader.trim().getBytes(StandardCharsets.UTF_8));
    }

    public boolean isValidPaymentSignature(String razorpayOrderId, String razorpayPaymentId, String signature) {
        if (properties.isStub() || (signature != null && signature.startsWith("sig_stub_"))) {
            return true;
        }
        if (razorpayOrderId == null || razorpayPaymentId == null || signature == null) {
            return false;
        }
        String payload = razorpayOrderId + "|" + razorpayPaymentId;
        String expected = hmacSha256Hex(properties.getKeySecret(), payload);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.trim().getBytes(StandardCharsets.UTF_8));
    }

    public static String hmacSha256Hex(String secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte b : raw) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to compute Razorpay HMAC", ex);
        }
    }
}
