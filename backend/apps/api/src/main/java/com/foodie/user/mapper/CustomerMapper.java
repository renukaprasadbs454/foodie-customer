package com.foodie.user.mapper;

import com.foodie.user.dto.response.AddressResponseDto;
import com.foodie.user.dto.response.CustomerProfileResponseDto;
import com.foodie.user.entity.Address;
import com.foodie.user.entity.Customer;
import org.springframework.stereotype.Component;

@Component
public class CustomerMapper {

    public CustomerProfileResponseDto toProfile(Customer customer, String phoneNumber) {
        return new CustomerProfileResponseDto(
                customer.getId(),
                customer.getFullName(),
                customer.getEmail(),
                phoneNumber,
                customer.getDefaultAddressId()
        );
    }

    public AddressResponseDto toAddress(Address address) {
        return new AddressResponseDto(
                address.getId(),
                address.getRecipientName(),
                address.getRecipientPhone(),
                address.getHouseFlatNo(),
                address.getLandmark(),
                address.getState(),
                address.getLabel(),
                address.getLine1(),
                address.getLine2(),
                address.getCity(),
                address.getPincode(),
                address.getLatitude(),
                address.getLongitude(),
                address.isDefault()
        );
    }
}
