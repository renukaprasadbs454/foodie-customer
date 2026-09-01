package com.foodie.coupon;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.foodie.coupon.listener.OrderConfirmedCouponListener;
import com.foodie.shared.contract.CouponService;
import com.foodie.shared.event.OrderConfirmedEvent;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OrderConfirmedCouponListenerTest {

    @Mock private CouponService couponService;
    @InjectMocks private OrderConfirmedCouponListener listener;

    @Test
    void onOrderConfirmed_withCoupon_recordsRedemption() {
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID couponId = UUID.randomUUID();

        listener.onOrderConfirmed(OrderConfirmedEvent.of(orderId, customerId, couponId));

        verify(couponService).recordRedemption(couponId, customerId, orderId);
    }

    @Test
    void onOrderConfirmed_withoutCoupon_skips() {
        listener.onOrderConfirmed(OrderConfirmedEvent.of(UUID.randomUUID(), UUID.randomUUID(), null));

        verify(couponService, never()).recordRedemption(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }
}
