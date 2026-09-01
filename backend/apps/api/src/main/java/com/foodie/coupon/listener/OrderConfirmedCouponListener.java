package com.foodie.coupon.listener;

import com.foodie.shared.contract.CouponService;
import com.foodie.shared.event.OrderConfirmedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Finalizes coupon_redemption on payment confirmation (Phase3 §2.12).
 * Synchronous (wallet-listener pattern) so usage limits stay consistent with committed orders.
 */
@Component
public class OrderConfirmedCouponListener {

    private static final Logger log = LoggerFactory.getLogger(OrderConfirmedCouponListener.class);

    private final CouponService couponService;

    public OrderConfirmedCouponListener(CouponService couponService) {
        this.couponService = couponService;
    }

    @EventListener
    @Transactional
    public void onOrderConfirmed(OrderConfirmedEvent event) {
        if (event.couponId() == null) {
            return;
        }
        log.info(
                "Finalizing coupon {} redemption for order {} customer {}",
                event.couponId(),
                event.orderId(),
                event.customerId()
        );
        couponService.recordRedemption(event.couponId(), event.customerId(), event.orderId());
    }
}
