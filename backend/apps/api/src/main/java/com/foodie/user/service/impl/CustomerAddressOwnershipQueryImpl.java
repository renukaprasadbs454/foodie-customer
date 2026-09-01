package com.foodie.user.service.impl;

import com.foodie.shared.contract.CustomerAddressOwnershipQuery;
import com.foodie.user.repository.AddressRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerAddressOwnershipQueryImpl implements CustomerAddressOwnershipQuery {

    private final AddressRepository addressRepository;

    public CustomerAddressOwnershipQueryImpl(AddressRepository addressRepository) {
        this.addressRepository = addressRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAddressOwnedByCustomer(UUID addressId, UUID customerId) {
        return addressRepository.findByIdAndCustomerId(addressId, customerId).isPresent();
    }
}
