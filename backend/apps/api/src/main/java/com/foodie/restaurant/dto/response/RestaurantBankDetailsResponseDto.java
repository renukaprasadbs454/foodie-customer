package com.foodie.restaurant.dto.response;

public record RestaurantBankDetailsResponseDto(
        BankAccountDetailsDto bankAccount,
        UpiDetailsDto upi
) {
}
