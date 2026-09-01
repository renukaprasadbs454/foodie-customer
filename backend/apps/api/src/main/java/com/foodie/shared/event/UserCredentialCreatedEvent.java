package com.foodie.shared.event;

import com.foodie.common.enums.UserType;
import java.time.Instant;
import java.util.UUID;

public record UserCredentialCreatedEvent(
        UUID eventId,
        Instant occurredAt,
        UUID userCredentialId,
        UserType userType,
        String phoneNumber,
        String email
) implements DomainEvent {

    public static UserCredentialCreatedEvent of(
            UUID userCredentialId,
            UserType userType,
            String phoneNumber,
            String email
    ) {
        return new UserCredentialCreatedEvent(
                UUID.randomUUID(),
                Instant.now(),
                userCredentialId,
                userType,
                phoneNumber,
                email
        );
    }
}
