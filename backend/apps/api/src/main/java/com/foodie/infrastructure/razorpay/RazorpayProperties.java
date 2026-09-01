package com.foodie.infrastructure.razorpay;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "foodie.razorpay")
public class RazorpayProperties {

    /** stub (local/dev) or live */
    private String mode = "stub";
    private String keyId = "rzp_test_local";
    private String keySecret = "local-razorpay-key-secret";
    private String webhookSecret = "local-razorpay-webhook-secret";
    private String apiBaseUrl = "https://api.razorpay.com/v1";

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getKeyId() {
        return keyId;
    }

    public void setKeyId(String keyId) {
        this.keyId = keyId;
    }

    public String getKeySecret() {
        return keySecret;
    }

    public void setKeySecret(String keySecret) {
        this.keySecret = keySecret;
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public void setWebhookSecret(String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public void setApiBaseUrl(String apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }

    public boolean isStub() {
        return !"live".equalsIgnoreCase(mode);
    }
}
