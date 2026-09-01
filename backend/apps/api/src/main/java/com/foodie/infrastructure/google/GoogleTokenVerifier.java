package com.foodie.infrastructure.google;

import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.UnauthorizedException;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GoogleTokenVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(@Value("${foodie.google.client-id}") String clientId) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(clientId))
                .build();
    }

    public GoogleIdentity verify(String idToken) {
        try {
            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                throw new UnauthorizedException(ErrorCode.INVALID_GOOGLE_TOKEN, "Invalid Google ID token.");
            }
            GoogleIdToken.Payload payload = token.getPayload();
            return new GoogleIdentity(
                    payload.getSubject(),
                    payload.getEmail(),
                    Boolean.TRUE.equals(payload.getEmailVerified())
            );
        } catch (GeneralSecurityException | IOException | IllegalArgumentException ex) {
            throw new UnauthorizedException(ErrorCode.INVALID_GOOGLE_TOKEN, "Invalid Google ID token.");
        }
    }

    public record GoogleIdentity(String googleId, String email, boolean emailVerified) {
    }
}
