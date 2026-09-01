package com.foodie.user.service.impl;

import com.foodie.auth.entity.UserCredential;
import com.foodie.auth.repository.UserCredentialRepository;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.user.entity.Customer;
import com.foodie.user.repository.CustomerRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerSummaryProviderImpl implements CustomerSummaryProvider {

    private final CustomerRepository customerRepository;
    private final UserCredentialRepository userCredentialRepository;

    public CustomerSummaryProviderImpl(
            CustomerRepository customerRepository,
            UserCredentialRepository userCredentialRepository) {
        this.customerRepository = customerRepository;
        this.userCredentialRepository = userCredentialRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CustomerSummary> findByCustomerId(UUID customerId) {
        return customerRepository.findById(customerId).map(this::toSummary);
    }

    @Override
    @Transactional
    public Optional<CustomerSummary> findByUserCredentialId(UUID userCredentialId) {
        Optional<CustomerSummary> existing = customerRepository.findByUserCredentialId(userCredentialId)
                .map(this::toSummary);
        if (existing.isPresent()) {
            return existing;
        }
        return userCredentialRepository.findById(userCredentialId)
                .map(u -> customerRepository.save(Customer.createInitial(u.getId(), u.getEmail())))
                .or(() -> Optional.of(customerRepository.save(Customer.createInitial(userCredentialId, null))))
                .map(this::toSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UUID> findUserCredentialIdByCustomerId(UUID customerId) {
        return customerRepository.findById(customerId).map(Customer::getUserCredentialId);
    }

    private CustomerSummary toSummary(com.foodie.user.entity.Customer c) {
        return new CustomerSummary(c.getId(), c.getFullName(), c.getProfileImageKey());
    }
}
