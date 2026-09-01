package com.foodie.wallet.repository;

import com.foodie.common.enums.OwnerType;
import com.foodie.wallet.entity.WalletAccount;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletAccountRepository extends JpaRepository<WalletAccount, UUID> {

    Optional<WalletAccount> findByOwnerTypeAndOwnerId(OwnerType ownerType, UUID ownerId);

    @Lock(LockModeType.OPTIMISTIC)
    @Query("select w from WalletAccount w where w.ownerType = :ownerType and w.ownerId = :ownerId")
    Optional<WalletAccount> findByOwnerTypeAndOwnerIdForUpdate(
            @Param("ownerType") OwnerType ownerType,
            @Param("ownerId") UUID ownerId
    );
}
