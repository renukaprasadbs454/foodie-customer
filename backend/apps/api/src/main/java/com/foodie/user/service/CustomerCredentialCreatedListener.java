package com.foodie.user.service;

import com.foodie.common.enums.UserType;
import com.foodie.shared.event.UserCredentialCreatedEvent;
import com.foodie.user.entity.Customer;
import com.foodie.user.repository.CustomerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Creates the initial customer row when Auth publishes first-time CUSTOMER signup (Phase3 §2.2).
 */
@Component
public class CustomerCredentialCreatedListener {

    private static final Logger log = LoggerFactory.getLogger(CustomerCredentialCreatedListener.class);

    private final CustomerRepository customerRepository;

    public CustomerCredentialCreatedListener(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onUserCredentialCreated(UserCredentialCreatedEvent event) {
        if (event.userType() != UserType.CUSTOMER) {
            return;
        }
        if (customerRepository.existsByUserCredentialId(event.userCredentialId())) {
            return;
        }
        customerRepository.save(Customer.createInitial(event.userCredentialId(), event.email()));
        log.info("Created customer profile for userCredentialId={}", event.userCredentialId());
    }
}
