package com.foodie.user.repository;

import com.foodie.user.entity.Customer;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    Optional<Customer> findByUserCredentialId(UUID userCredentialId);

    boolean existsByUserCredentialId(UUID userCredentialId);
}
