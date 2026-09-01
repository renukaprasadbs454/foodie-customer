package com.foodie.infrastructure.razorpay;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RazorpaySignatureVerifierTest {

    private RazorpaySignatureVerifier verifier;

    @BeforeEach
    void setUp() {
        RazorpayProperties props = new RazorpayProperties();
        props.setMode("live");
        props.setWebhookSecret("whsec_test");
        verifier = new RazorpaySignatureVerifier(props);
    }

    @Test
    void isValid_matchingSignature_true() {
        String body = "{\"event\":\"payment.captured\"}";
        String sig = RazorpaySignatureVerifier.hmacSha256Hex("whsec_test", body);
        assertThat(verifier.isValid(body, sig)).isTrue();
    }

    @Test
    void isValid_wrongSignature_false() {
        assertThat(verifier.isValid("{}", "deadbeef")).isFalse();
    }

    @Test
    void isValid_missingSignature_false() {
        assertThat(verifier.isValid("{}", null)).isFalse();
        assertThat(verifier.isValid("{}", "  ")).isFalse();
    }
}
