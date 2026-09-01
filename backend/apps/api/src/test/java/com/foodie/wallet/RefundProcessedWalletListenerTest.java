package com.foodie.wallet;

import static org.mockito.Mockito.verify;

import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.shared.event.RefundProcessedEvent;
import com.foodie.wallet.listener.RefundProcessedWalletListener;
import com.foodie.wallet.service.WalletService;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RefundProcessedWalletListenerTest {

    @Mock private WalletService walletService;

    private RefundProcessedWalletListener listener;

    @BeforeEach
    void setUp() {
        listener = new RefundProcessedWalletListener(walletService);
    }

    @Test
    void creditsPlatformWallet() {
        UUID paymentId = UUID.randomUUID();
        UUID refundId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("150.00");

        listener.onRefundProcessed(RefundProcessedEvent.of(paymentId, refundId, amount));

        verify(walletService).credit(
                OwnerType.PLATFORM,
                WalletConstants.PLATFORM_OWNER_ID,
                amount,
                LedgerReferenceType.REFUND,
                refundId
        );
    }
}
