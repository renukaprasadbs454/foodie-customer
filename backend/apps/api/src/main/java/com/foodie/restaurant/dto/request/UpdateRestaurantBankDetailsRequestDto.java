package com.foodie.restaurant.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateRestaurantBankDetailsRequestDto(
        @Size(max = 255)
        String accountHolderName,

        @Size(max = 255)
        String bankName,

        @Pattern(regexp = "^\\d{9,18}$", message = "Account number must be 9 to 18 digits")
        String accountNumber,

        @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "Invalid IFSC format (e.g. HDFC0001234)")
        String ifscCode,

        @Pattern(regexp = "^(SAVINGS|CURRENT)$", message = "Account type must be SAVINGS or CURRENT")
        String accountType,

        @Size(max = 255)
        String branchName,

        @Pattern(regexp = "^[a-zA-Z0-9.\\-_]{2,256}@[a-zA-Z]{2,64}$", message = "Invalid UPI ID format")
        String upiId
) {
}
