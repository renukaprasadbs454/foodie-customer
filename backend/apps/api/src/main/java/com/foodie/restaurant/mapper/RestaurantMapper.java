package com.foodie.restaurant.mapper;

import com.foodie.restaurant.dto.response.BankAccountDetailsDto;
import com.foodie.restaurant.dto.response.RestaurantAddressResponseDto;
import com.foodie.restaurant.dto.response.RestaurantBankDetailsResponseDto;
import com.foodie.restaurant.dto.response.RestaurantDetailResponseDto;
import com.foodie.restaurant.dto.response.RestaurantDocumentResponseDto;
import com.foodie.restaurant.dto.response.RestaurantLegalDetailResponseDto;
import com.foodie.restaurant.dto.response.RestaurantLocationResponseDto;
import com.foodie.restaurant.dto.response.RestaurantSummaryResponseDto;
import com.foodie.restaurant.dto.response.RestaurantUpiResponseDto;
import com.foodie.restaurant.dto.response.UpiDetailsDto;
import com.foodie.restaurant.entity.Restaurant;
import com.foodie.restaurant.entity.RestaurantAddress;
import com.foodie.restaurant.entity.RestaurantBankDetails;
import com.foodie.restaurant.entity.RestaurantDocument;
import com.foodie.restaurant.entity.RestaurantLegalDetail;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class RestaurantMapper {

    public RestaurantSummaryResponseDto toSummary(Restaurant restaurant, String imageUrl) {
        return new RestaurantSummaryResponseDto(
                restaurant.getId(),
                restaurant.getName(),
                cuisineList(restaurant),
                restaurant.getAvgRating(),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                imageUrl);
    }

    public RestaurantDetailResponseDto toDetail(
            Restaurant restaurant,
            String logoUrl,
            String coverUrl,
            boolean privileged) {
        RestaurantAddress address = restaurant.getAddress();
        return new RestaurantDetailResponseDto(
                restaurant.getId(),
                restaurant.getName(),
                restaurant.getDescription(),
                cuisineList(restaurant),
                new RestaurantAddressResponseDto(
                        address.getLine1(),
                        address.getLine2(),
                        address.getLandmark(),
                        address.getCity(),
                        address.getState(),
                        address.getCountry(),
                        address.getPincode(),
                        address.getFormattedAddress(),
                        address.getLatitude(),
                        address.getLongitude()),
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                logoUrl,
                coverUrl,
                restaurant.getAvgRating(),
                restaurant.getStatus().name(),
                restaurant.getRestaurantType(),
                restaurant.getRejectionReason(),
                privileged ? restaurant.getCommissionPct() : null,
                privileged ? restaurant.getOwnerUserCredentialId() : null);
    }

    public RestaurantLocationResponseDto toLocation(Restaurant restaurant) {
        RestaurantAddress address = restaurant.getAddress();
        String formatted = address.getFormattedAddress();
        if (formatted == null || formatted.isBlank()) {
            formatted = String.join(", ",
                    List.of(
                            address.getLine1() != null ? address.getLine1() : "",
                            address.getLine2() != null ? address.getLine2() : "",
                            address.getLandmark() != null ? address.getLandmark() : "",
                            (address.getCity() != null ? address.getCity() : "")
                                    + (address.getState() != null ? ", " + address.getState() : "")
                                    + (address.getPincode() != null ? " - " + address.getPincode() : ""),
                            address.getCountry() != null ? address.getCountry() : "India"
                    ).stream().filter(s -> !s.isBlank()).toList()
            );
        }
        return new RestaurantLocationResponseDto(
                restaurant.getLatitude(),
                restaurant.getLongitude(),
                address.getLine1(),
                address.getLine2(),
                address.getLandmark(),
                address.getCity(),
                address.getState(),
                address.getCountry(),
                address.getPincode(),
                formatted
        );
    }

    public RestaurantBankDetailsResponseDto toBankDetails(RestaurantBankDetails details) {
        if (details == null) {
            return new RestaurantBankDetailsResponseDto(
                    new BankAccountDetailsDto(null, null, null, null, null, "CURRENT", null, "NOT_SUBMITTED"),
                    new UpiDetailsDto(null, "NOT_SUBMITTED")
            );
        }
        return new RestaurantBankDetailsResponseDto(
                new BankAccountDetailsDto(
                        details.getAccountHolderName(),
                        details.getBankName(),
                        details.getAccountNumber(),
                        BankAccountDetailsDto.mask(details.getAccountNumber()),
                        details.getIfscCode(),
                        details.getAccountType(),
                        details.getBranchName(),
                        details.getVerificationStatus()
                ),
                new UpiDetailsDto(
                        details.getUpiId(),
                        details.getUpiVerificationStatus()
                )
        );
    }

    public RestaurantDocumentResponseDto toDocument(RestaurantDocument document) {
        return new RestaurantDocumentResponseDto(
                document.getId(),
                document.getDocType().name(),
                document.getVerifiedAt());
    }

    public RestaurantUpiResponseDto toUpiResponse(Restaurant restaurant) {
        return new RestaurantUpiResponseDto(
                restaurant.getUpiId(),
                restaurant.getUpiName(),
                restaurant.isUpiVerified(),
                restaurant.getUpiVerifiedAt()
        );
    }

    public RestaurantLegalDetailResponseDto toLegalDetailResponse(RestaurantLegalDetail detail) {
        return new RestaurantLegalDetailResponseDto(
                detail.getId(),
                detail.getRestaurant().getId(),
                detail.getGstin(),
                detail.getPan(),
                detail.getFssaiLicenseNumber(),
                detail.getLegalName(),
                detail.getBusinessType(),
                detail.getContactEmail(),
                detail.getContactPhone(),
                detail.getCreatedAt(),
                detail.getUpdatedAt()
        );
    }

    private static List<String> cuisineList(Restaurant restaurant) {
        String[] types = restaurant.getCuisineTypes();
        return types == null ? List.of() : Arrays.asList(types);
    }
}
