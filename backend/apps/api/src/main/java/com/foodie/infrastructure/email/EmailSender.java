package com.foodie.infrastructure.email;

/**
 * Email channel abstraction. Notification V1 does not dispatch EMAIL (Phase3 channel CHECK is
 * PUSH|SMS only); this interface exists for future channel wiring without coupling callers to a vendor.
 */
public interface EmailSender {

    void send(String toEmail, String subject, String body);
}
