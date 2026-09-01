package com.foodie.user.repository;

import com.foodie.user.entity.Address;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AddressRepository extends JpaRepository<Address, UUID> {

    List<Address> findByCustomerIdOrderByCreatedAtAsc(UUID customerId);

    Optional<Address> findByIdAndCustomerId(UUID id, UUID customerId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Address a set a.isDefault = false where a.customer.id = :customerId and a.isDefault = true")
    void clearDefaultForCustomer(@Param("customerId") UUID customerId);
}
