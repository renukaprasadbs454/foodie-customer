package com.foodie.wallet;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.shared.contract.OrderDeliveryFeeQuery;
import com.foodie.shared.event.DeliveryCompletedEvent;
import com.foodie.wallet.listener.DeliveryCompletedWalletListener;
import com.foodie.wallet.service.WalletService;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DeliveryCompletedWalletListenerTest {

    @Mock private WalletService walletService;
    @Mock private OrderDeliveryFeeQuery orderDeliveryFeeQuery;

    private DeliveryCompletedWalletListener listener;

    @BeforeEach
    void setUp() {
        listener = new DeliveryCompletedWalletListener(walletService, orderDeliveryFeeQuery);
    }

    @Test
    void creditsPartnerWithOrderDeliveryFee() {
        UUID orderId = UUID.randomUUID();
        UUID partnerId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        when(orderDeliveryFeeQuery.findDeliveryFeeByOrderId(orderId))
                .thenReturn(Optional.of(new BigDecimal("30.00")));

        listener.onDeliveryCompleted(DeliveryCompletedEvent.of(orderId, partnerId, assignmentId));

        verify(walletService).credit(
                OwnerType.DELIVERY_PARTNER,
                partnerId,
                new BigDecimal("30.00"),
                LedgerReferenceType.DELIVERY_ASSIGNMENT,
                assignmentId
        );
    }

    @Test
    void skipsWhenFeeMissing() {
        UUID orderId = UUID.randomUUID();
        when(orderDeliveryFeeQuery.findDeliveryFeeByOrderId(orderId)).thenReturn(Optional.empty());

        listener.onDeliveryCompleted(DeliveryCompletedEvent.of(orderId, UUID.randomUUID(), UUID.randomUUID()));

        verify(walletService, never()).credit(any(), any(), any(), any(), any());
    }
}
