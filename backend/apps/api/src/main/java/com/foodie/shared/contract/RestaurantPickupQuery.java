package com.foodie.shared.contract;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/** Pickup address for delivery offers (Phase3 §2.8). */
public interface RestaurantPickupQuery {

    Optional<PickupLocation> findByRestaurantId(UUID restaurantId);

    record PickupLocation(
            UUID restaurantId,
            String restaurantName,
            String line1,
            String line2,
            String city,
            String pincode,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        public String formattedAddress() {
            StringBuilder sb = new StringBuilder(line1);
            if (line2 != null && !line2.isBlank()) {
                sb.append(", ").append(line2);
            }
            sb.append(", ").append(city).append(" ").append(pincode);
            return sb.toString();
        }
    }
}
