package com.foodie.order.listener;

import com.foodie.order.service.OrderService;
import com.foodie.shared.event.PaymentCapturedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * PLACED→CONFIRMED on payment capture (Phase3 §10.5). Payment module publishes the event later.
 */
@Component
public class PaymentCapturedEventListener {

    private static final Logger log = LoggerFactory.getLogger(PaymentCapturedEventListener.class);

    private final OrderService orderService;

    public PaymentCapturedEventListener(OrderService orderService) {
        this.orderService = orderService;
    }

    @EventListener
    @Transactional
    public void onPaymentCaptured(PaymentCapturedEvent event) {
        log.info("Payment captured for order {}", event.orderId());
        orderService.confirmAfterPayment(event.orderId());
    }
}
