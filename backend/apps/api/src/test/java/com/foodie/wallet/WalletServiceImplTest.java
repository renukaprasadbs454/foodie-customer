package com.foodie.wallet;

import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.common.enums.LedgerEntryType;
import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.restaurant.repository.RestaurantRepository;
import com.foodie.common.enums.UserType;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import com.foodie.shared.event.PayoutRequestedEvent;
import com.foodie.shared.event.WalletCreditedEvent;
import com.foodie.wallet.dto.request.PayoutRequestDto;
import com.foodie.wallet.dto.response.LedgerEntryResponseDto;
import com.foodie.wallet.dto.response.PayoutResponseDto;
import com.foodie.wallet.dto.response.WalletBalanceResponseDto;
import com.foodie.wallet.entity.LedgerEntry;
import com.foodie.wallet.entity.Payout;
import com.foodie.wallet.entity.WalletAccount;
import com.foodie.wallet.repository.LedgerEntryRepository;
import com.foodie.wallet.repository.PayoutRepository;
import com.foodie.wallet.repository.WalletAccountRepository;
import com.foodie.wallet.service.PayoutIdempotencyStore;
import com.foodie.wallet.service.impl.WalletServiceImpl;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class WalletServiceImplTest {

        @Mock
        private WalletAccountRepository walletAccountRepository;
        @Mock
        private LedgerEntryRepository ledgerEntryRepository;
        @Mock
        private PayoutRepository payoutRepository;
        @Mock
        private DeliveryPartnerLookup deliveryPartnerLookup;
        @Mock
        private RestaurantRepository restaurantRepository;
        @Mock
        private CustomerSummaryProvider customerSummaryProvider;
        @Mock
        private com.foodie.shared.contract.RestaurantSummaryProvider restaurantSummaryProvider;
        @Mock
        private PayoutIdempotencyStore payoutIdempotencyStore;
        @Mock
        private ApplicationEventPublisher eventPublisher;

        private WalletServiceImpl service;

        private final UUID credentialId = UUID.randomUUID();
        private final UUID partnerId = UUID.randomUUID();

        @BeforeEach
        void setUp() {
                service = new WalletServiceImpl(
                                walletAccountRepository,
                                ledgerEntryRepository,
                                payoutRepository,
                                deliveryPartnerLookup,
                                restaurantRepository,
                                customerSummaryProvider,
                                restaurantSummaryProvider,
                                payoutIdempotencyStore,
                                eventPublisher);
        }

        @Test
        void getBalance_returnsCachedBalance() {
                WalletAccount account = WalletAccount.open(OwnerType.DELIVERY_PARTNER, partnerId);
                account.applyCredit(new BigDecimal("120.50"));
                when(deliveryPartnerLookup.findPartnerIdByUserCredentialId(credentialId))
                                .thenReturn(Optional.of(partnerId));
                when(walletAccountRepository.findByOwnerTypeAndOwnerId(OwnerType.DELIVERY_PARTNER, partnerId))
                                .thenReturn(Optional.of(account));

                WalletBalanceResponseDto balance = service.getBalance(credentialId, UserType.DELIVERY_PARTNER);

                assertThat(balance.balance()).isEqualByComparingTo("120.50");
                assertThat(balance.walletAccountId()).isEqualTo(account.getId());
        }

        @Test
        void credit_appendsLedgerAndUpdatesCache() {
                WalletAccount account = WalletAccount.open(OwnerType.DELIVERY_PARTNER, partnerId);
                UUID assignmentId = UUID.randomUUID();
                when(deliveryPartnerLookup.existsById(partnerId)).thenReturn(true);
                when(ledgerEntryRepository.findByReferenceTypeAndReferenceId(
                                LedgerReferenceType.DELIVERY_ASSIGNMENT, assignmentId))
                                .thenReturn(Optional.empty());
                when(walletAccountRepository.findByOwnerTypeAndOwnerIdForUpdate(
                                OwnerType.DELIVERY_PARTNER, partnerId))
                                .thenReturn(Optional.of(account));
                when(ledgerEntryRepository.save(any(LedgerEntry.class))).thenAnswer(inv -> inv.getArgument(0));
                when(walletAccountRepository.save(any(WalletAccount.class))).thenAnswer(inv -> inv.getArgument(0));

                LedgerEntryResponseDto result = service.credit(
                                OwnerType.DELIVERY_PARTNER,
                                partnerId,
                                new BigDecimal("30.00"),
                                LedgerReferenceType.DELIVERY_ASSIGNMENT,
                                assignmentId);

                assertThat(result.entryType()).isEqualTo(LedgerEntryType.CREDIT);
                assertThat(result.amount()).isEqualByComparingTo("30.00");
                assertThat(account.getBalance()).isEqualByComparingTo("30.00");
                verify(eventPublisher).publishEvent(any(WalletCreditedEvent.class));
        }

        @Test
        void credit_idempotentOnSameReference() {
                UUID assignmentId = UUID.randomUUID();
                WalletAccount account = WalletAccount.open(OwnerType.DELIVERY_PARTNER, partnerId);
                LedgerEntry existing = LedgerEntry.credit(
                                account.getId(), new BigDecimal("30.00"),
                                LedgerReferenceType.DELIVERY_ASSIGNMENT, assignmentId);
                when(deliveryPartnerLookup.existsById(partnerId)).thenReturn(true);
                when(ledgerEntryRepository.findByReferenceTypeAndReferenceId(
                                LedgerReferenceType.DELIVERY_ASSIGNMENT, assignmentId))
                                .thenReturn(Optional.of(existing));

                LedgerEntryResponseDto result = service.credit(
                                OwnerType.DELIVERY_PARTNER,
                                partnerId,
                                new BigDecimal("30.00"),
                                LedgerReferenceType.DELIVERY_ASSIGNMENT,
                                assignmentId);

                assertThat(result.amount()).isEqualByComparingTo("30.00");
                verify(ledgerEntryRepository, never()).save(any());
                verify(eventPublisher, never()).publishEvent(any());
        }

        @Test
        void credit_platformRefund() {
                UUID refundId = UUID.randomUUID();
                WalletAccount platform = WalletAccount.open(OwnerType.PLATFORM, WalletConstants.PLATFORM_OWNER_ID);
                when(ledgerEntryRepository.findByReferenceTypeAndReferenceId(LedgerReferenceType.REFUND, refundId))
                                .thenReturn(Optional.empty());
                when(walletAccountRepository.findByOwnerTypeAndOwnerIdForUpdate(
                                OwnerType.PLATFORM, WalletConstants.PLATFORM_OWNER_ID))
                                .thenReturn(Optional.of(platform));
                when(ledgerEntryRepository.save(any(LedgerEntry.class))).thenAnswer(inv -> inv.getArgument(0));
                when(walletAccountRepository.save(any(WalletAccount.class))).thenAnswer(inv -> inv.getArgument(0));

                LedgerEntryResponseDto result = service.credit(
                                OwnerType.PLATFORM,
                                WalletConstants.PLATFORM_OWNER_ID,
                                new BigDecimal("99.00"),
                                LedgerReferenceType.REFUND,
                                refundId);

                assertThat(result.referenceType()).isEqualTo(LedgerReferenceType.REFUND);
                assertThat(platform.getBalance()).isEqualByComparingTo("99.00");
        }

        @Test
        void requestPayout_insufficientBalance_throws422() {
                WalletAccount account = WalletAccount.open(OwnerType.DELIVERY_PARTNER, partnerId);
                account.applyCredit(new BigDecimal("10.00"));
                when(deliveryPartnerLookup.findPartnerIdByUserCredentialId(credentialId))
                                .thenReturn(Optional.of(partnerId));
                when(walletAccountRepository.findByOwnerTypeAndOwnerIdForUpdate(
                                OwnerType.DELIVERY_PARTNER, partnerId))
                                .thenReturn(Optional.of(account));
                when(payoutRepository.sumAmountByWalletAccountIdAndStatusIn(eq(account.getId()), any()))
                                .thenReturn(BigDecimal.ZERO);

                assertThatThrownBy(() -> service.requestPayout(
                                credentialId,
                                new PayoutRequestDto(new BigDecimal("50.00"), "John Doe", "1234567890", "IFSC0001234",
                                                "Bank"),
                                null))
                                .isInstanceOf(UnprocessableEntityException.class)
                                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.INSUFFICIENT_BALANCE);
                verify(payoutRepository, never()).save(any());
        }

        @Test
        void requestPayout_createsRequestedWithoutLedgerDebit() {
                WalletAccount account = WalletAccount.open(OwnerType.DELIVERY_PARTNER, partnerId);
                account.applyCredit(new BigDecimal("100.00"));
                when(deliveryPartnerLookup.findPartnerIdByUserCredentialId(credentialId))
                                .thenReturn(Optional.of(partnerId));
                when(walletAccountRepository.findByOwnerTypeAndOwnerIdForUpdate(
                                OwnerType.DELIVERY_PARTNER, partnerId))
                                .thenReturn(Optional.of(account));
                when(payoutRepository.sumAmountByWalletAccountIdAndStatusIn(eq(account.getId()), any()))
                                .thenReturn(BigDecimal.ZERO);
                when(payoutRepository.save(any(Payout.class))).thenAnswer(inv -> inv.getArgument(0));

                PayoutResponseDto response = service.requestPayout(
                                credentialId, new PayoutRequestDto(new BigDecimal("40.00"), "John Doe", "1234567890",
                                                "IFSC0001234", "Bank"),
                                "pay-key-1");

                assertThat(response.status()).isEqualTo(PayoutStatus.REQUESTED);
                assertThat(response.amount()).isEqualByComparingTo("40.00");
                assertThat(account.getBalance()).isEqualByComparingTo("100.00");
                verify(ledgerEntryRepository, never()).save(any());
                verify(eventPublisher).publishEvent(any(PayoutRequestedEvent.class));
                verify(payoutIdempotencyStore).store(eq("pay-key-1"), any());
        }

        @Test
        void getLedger_invalidSort_throws400() {
                when(deliveryPartnerLookup.findPartnerIdByUserCredentialId(credentialId))
                                .thenReturn(Optional.of(partnerId));
                when(walletAccountRepository.findByOwnerTypeAndOwnerId(OwnerType.DELIVERY_PARTNER, partnerId))
                                .thenReturn(Optional.of(WalletAccount.open(OwnerType.DELIVERY_PARTNER, partnerId)));

                assertThatThrownBy(() -> service.getLedger(credentialId, UserType.DELIVERY_PARTNER, 0, 20, "amount",
                                null, null))
                                .isInstanceOf(BadRequestException.class)
                                .extracting(ex -> ((BadRequestException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.INVALID_SORT_FIELD);
        }

        @Test
        void getLedger_filtersAndPages() {
                WalletAccount account = WalletAccount.open(OwnerType.DELIVERY_PARTNER, partnerId);
                LedgerEntry entry = LedgerEntry.credit(
                                account.getId(),
                                new BigDecimal("30.00"),
                                LedgerReferenceType.DELIVERY_ASSIGNMENT,
                                UUID.randomUUID());
                Instant from = Instant.parse("2026-01-01T00:00:00Z");
                Instant to = Instant.parse("2026-12-31T23:59:59Z");
                when(deliveryPartnerLookup.findPartnerIdByUserCredentialId(credentialId))
                                .thenReturn(Optional.of(partnerId));
                when(walletAccountRepository.findByOwnerTypeAndOwnerId(OwnerType.DELIVERY_PARTNER, partnerId))
                                .thenReturn(Optional.of(account));
                when(ledgerEntryRepository.findHistory(eq(account.getId()), eq(from), eq(to), any(Pageable.class)))
                                .thenReturn(new PageImpl<>(List.of(entry)));

                var page = service.getLedger(credentialId, UserType.DELIVERY_PARTNER, 0, 20, "createdAt", from, to);

                assertThat(page.items()).hasSize(1);
                assertThat(page.items().getFirst().entryType()).isEqualTo(LedgerEntryType.CREDIT);
                ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
                verify(ledgerEntryRepository).findHistory(eq(account.getId()), eq(from), eq(to),
                                pageableCaptor.capture());
                assertThat(pageableCaptor.getValue().getSort().getOrderFor("createdAt").getDirection())
                                .isEqualTo(org.springframework.data.domain.Sort.Direction.DESC);
        }

        @Test
        void getLedger_withoutDateFilters_callsFindByWalletAccountId() {
                WalletAccount account = WalletAccount.open(OwnerType.DELIVERY_PARTNER, partnerId);
                LedgerEntry entry = LedgerEntry.credit(
                                account.getId(),
                                new BigDecimal("30.00"),
                                LedgerReferenceType.DELIVERY_ASSIGNMENT,
                                UUID.randomUUID());
                when(deliveryPartnerLookup.findPartnerIdByUserCredentialId(credentialId))
                                .thenReturn(Optional.of(partnerId));
                when(walletAccountRepository.findByOwnerTypeAndOwnerId(OwnerType.DELIVERY_PARTNER, partnerId))
                                .thenReturn(Optional.of(account));
                when(ledgerEntryRepository.findByWalletAccountId(eq(account.getId()), any(Pageable.class)))
                                .thenReturn(new PageImpl<>(List.of(entry)));

                var page = service.getLedger(credentialId, UserType.DELIVERY_PARTNER, 0, 20, "createdAt", null, null);

                assertThat(page.items()).hasSize(1);
                verify(ledgerEntryRepository).findByWalletAccountId(eq(account.getId()), any(Pageable.class));
        }
}
