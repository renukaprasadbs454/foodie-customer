package com.foodie.wallet.listener;

import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.shared.event.RefundProcessedEvent;
import com.foodie.wallet.WalletConstants;
import com.foodie.wallet.service.WalletService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Refund credits: RefundProcessedEvent → append-only CREDIT on PLATFORM wallet.
 * Customer Razorpay refund remains Payment-owned; this is the platform ledger trail.
 */
@Component
public class RefundProcessedWalletListener {

    private static final Logger log = LoggerFactory.getLogger(RefundProcessedWalletListener.class);

    private final WalletService walletService;

    public RefundProcessedWalletListener(WalletService walletService) {
        this.walletService = walletService;
    }

    @EventListener
    @Transactional
    public void onRefundProcessed(RefundProcessedEvent event) {
        log.info(
                "Recording PLATFORM refund credit for refundRequest {} amount {}",
                event.refundRequestId(),
                event.amount()
        );
        walletService.credit(
                OwnerType.PLATFORM,
                WalletConstants.PLATFORM_OWNER_ID,
                event.amount(),
                LedgerReferenceType.REFUND,
                event.refundRequestId()
        );
    }
}
