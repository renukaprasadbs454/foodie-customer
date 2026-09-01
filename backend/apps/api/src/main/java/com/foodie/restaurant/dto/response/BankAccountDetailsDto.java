package com.foodie.restaurant.dto.response;

public record BankAccountDetailsDto(
        String accountHolderName,
        String bankName,
        String accountNumber,
        String accountNumberMasked,
        String ifscCode,
        String accountType,
        String branchName,
        String verificationStatus
) {
    public static String mask(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) {
            return null;
        }
        String clean = accountNumber.replaceAll("\\s+", "");
        if (clean.length() <= 4) {
            return clean;
        }
        String lastFour = clean.substring(clean.length() - 4);
        return "XXXX XXXX " + lastFour;
    }
}
