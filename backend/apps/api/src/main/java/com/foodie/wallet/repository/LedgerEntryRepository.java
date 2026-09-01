package com.foodie.wallet.repository;

import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.wallet.entity.LedgerEntry;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

        boolean existsByReferenceTypeAndReferenceId(LedgerReferenceType referenceType, UUID referenceId);

        Optional<LedgerEntry> findByReferenceTypeAndReferenceId(
                        LedgerReferenceType referenceType, UUID referenceId);

        Page<LedgerEntry> findByWalletAccountId(UUID walletAccountId, Pageable pageable);

        @Query("""
                        select e from LedgerEntry e
                        where e.walletAccountId = :walletAccountId
                          and (cast(:from as timestamp) is null or e.createdAt >= :from)
                          and (cast(:to as timestamp) is null or e.createdAt <= :to)
                        """)
        Page<LedgerEntry> findHistory(
                        @Param("walletAccountId") UUID walletAccountId,
                        @Param("from") Instant from,
                        @Param("to") Instant to,
                        Pageable pageable);
}
