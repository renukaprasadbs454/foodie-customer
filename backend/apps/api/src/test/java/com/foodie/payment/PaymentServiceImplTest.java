package com.foodie.payment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.enums.OrderStatus;
import com.foodie.common.enums.PaymentStatus;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.infrastructure.razorpay.RazorpayClient;
import com.foodie.infrastructure.razorpay.RazorpayProperties;
import com.foodie.infrastructure.razorpay.RazorpaySignatureVerifier;
import com.foodie.payment.dto.request.RefundPaymentRequestDto;
import com.foodie.payment.dto.response.PaymentInitiationResponseDto;
import com.foodie.payment.entity.Payment;
import com.foodie.payment.entity.RefundRequest;
import com.foodie.payment.repository.PaymentRepository;
import com.foodie.payment.repository.RefundRequestRepository;
import com.foodie.payment.service.PaymentIdempotencyStore;
import com.foodie.wallet.service.WalletService;
import com.foodie.payment.service.WebhookDedupService;
import com.foodie.payment.service.impl.PaymentServiceImpl;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.OrderPaymentPort;
import com.foodie.shared.event.PaymentCapturedEvent;
import com.foodie.shared.event.PaymentFailedEvent;
import java.math.BigDecimal;
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

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private RefundRequestRepository refundRequestRepository;
    @Mock
    private OrderPaymentPort orderPaymentPort;
    @Mock
    private CustomerSummaryProvider customerSummaryProvider;
    @Mock
    private RazorpayClient razorpayClient;
    @Mock
    private WebhookDedupService webhookDedupService;
    @Mock
    private PaymentIdempotencyStore idempotencyStore;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private WalletService walletService;

    private PaymentServiceImpl service;
    private RazorpaySignatureVerifier signatureVerifier;
    private final UUID credentialId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        RazorpayProperties props = new RazorpayProperties();
        props.setKeyId("rzp_test_key");
        props.setWebhookSecret("whsec_test");
props.setMode("live");

        signatureVerifier = new RazorpaySignatureVerifier(props);
        service = new PaymentServiceImpl(
                paymentRepository,
                refundRequestRepository,
                orderPaymentPort,
                customerSummaryProvider,
                razorpayClient,
                props,
                signatureVerifier,
                webhookDedupService,
                idempotencyStore,
                new ObjectMapper(),
                eventPublisher,
                walletService);
    }

    @Test
    void initiate_missingKey_throws400() {
        assertThatThrownBy(() -> service.initiate(credentialId, orderId, null, false))
                .isInstanceOf(BadRequestException.class)
                .extracting(ex -> ((BadRequestException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IDEMPOTENCY_KEY_REQUIRED);
    }

    @Test
    void initiate_orderNotPlaced_throwsOrderNotPayable() {
        when(idempotencyStore.find("k1")).thenReturn(Optional.empty());
        when(paymentRepository.findByIdempotencyKey("k1")).thenReturn(Optional.empty());
        when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.of(
                new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
        when(orderPaymentPort.findByOrderId(orderId)).thenReturn(Optional.of(
                new OrderPaymentPort.PayableOrder(
                        orderId, customerId, OrderStatus.CONFIRMED, new BigDecimal("100.00"))));

        assertThatThrownBy(() -> service.initiate(credentialId, orderId, "k1", false))
                .isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_NOT_PAYABLE);
    }

    @Test
    void initiate_createsPendingPayment() {
        when(idempotencyStore.find("k1")).thenReturn(Optional.empty());
        when(paymentRepository.findByIdempotencyKey("k1")).thenReturn(Optional.empty());
        when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.of(
                new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
        when(orderPaymentPort.findByOrderId(orderId)).thenReturn(Optional.of(
                new OrderPaymentPort.PayableOrder(
                        orderId, customerId, OrderStatus.PLACED, new BigDecimal("492.00"))));
        when(paymentRepository.findByOrderId(orderId)).thenReturn(Optional.empty());
        when(razorpayClient.createOrder(any(), any(), any())).thenReturn(
                new RazorpayClient.RazorpayOrderCreateResult(
                        "order_abc", new BigDecimal("492.00"), "INR"));
        when(paymentRepository.save(any())).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            setId(p, UUID.randomUUID());
            return p;
        });

        PaymentInitiationResponseDto view = service.initiate(credentialId, orderId, "k1", false);

        assertThat(view.razorpayOrderId()).isEqualTo("order_abc");
        assertThat(view.amount()).isEqualByComparingTo("492.00");
        assertThat(view.keyId()).isEqualTo("rzp_test_key");
        verify(idempotencyStore).store(eq("k1"), any());
    }

    @Test
    void handleWebhook_invalidSignature_throws400() {
        assertThatThrownBy(() -> service.handleWebhook("{}", "bad"))
                .isInstanceOf(BadRequestException.class)
                .extracting(ex -> ((BadRequestException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_WEBHOOK_SIGNATURE);
        verify(webhookDedupService, never()).markProcessed(any());
    }

    @Test
    void handleWebhook_duplicate_acknowledgesWithoutSideEffects() {
        String body = "{\"id\":\"evt_1\",\"event\":\"payment.captured\"}";
        String sig = RazorpaySignatureVerifier.hmacSha256Hex("whsec_test", body);
        when(webhookDedupService.isDuplicate("evt_1")).thenReturn(true);

        service.handleWebhook(body, sig);

        verify(paymentRepository, never()).findByRazorpayOrderId(any());
        verify(webhookDedupService, never()).markProcessed(any());
    }

    @Test
    void handleWebhook_paymentCaptured_publishesEvent() {
        Payment payment = Payment.initiate(orderId, "order_abc", new BigDecimal("10.00"), BigDecimal.ZERO, "k");
        setId(payment, UUID.randomUUID());
        String body = """
                {"id":"evt_2","event":"payment.captured","payload":{"payment":{"entity":{
                  "id":"pay_1","order_id":"order_abc","status":"captured"}}}}
                """;
        String sig = RazorpaySignatureVerifier.hmacSha256Hex("whsec_test", body);
        when(webhookDedupService.isDuplicate("evt_2")).thenReturn(false);
        when(paymentRepository.findByRazorpayOrderId("order_abc")).thenReturn(Optional.of(payment));

        service.handleWebhook(body, sig);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CAPTURED);
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue()).isInstanceOf(PaymentCapturedEvent.class);
        verify(webhookDedupService).markProcessed("evt_2");
    }

    @Test
    void handleWebhook_paymentFailed_publishesFailedEvent() {
        Payment payment = Payment.initiate(orderId, "order_abc", new BigDecimal("10.00"), BigDecimal.ZERO, "k");
        setId(payment, UUID.randomUUID());
        String body = """
                {"id":"evt_3","event":"payment.failed","payload":{"payment":{"entity":{
                  "id":"pay_x","order_id":"order_abc","status":"failed"}}}}
                """;
        String sig = RazorpaySignatureVerifier.hmacSha256Hex("whsec_test", body);
        when(webhookDedupService.isDuplicate("evt_3")).thenReturn(false);
        when(paymentRepository.findByRazorpayOrderId("order_abc")).thenReturn(Optional.of(payment));

        service.handleWebhook(body, sig);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);
        verify(eventPublisher).publishEvent(any(PaymentFailedEvent.class));
    }

    @Test
    void refund_notCaptured_throws422() {
        Payment payment = Payment.initiate(orderId, "order_abc", new BigDecimal("10.00"), BigDecimal.ZERO, "k");
        setId(payment, UUID.randomUUID());
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));

        assertThatThrownBy(() -> service.refund(
                payment.getId(),
                new RefundPaymentRequestDto(new BigDecimal("10.00"), "cancel"),
                UUID.randomUUID(),
                false)).isInstanceOf(UnprocessableEntityException.class)
                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                .isEqualTo(ErrorCode.PAYMENT_NOT_REFUNDABLE);
    }

    @Test
    void refund_captured_initiatesAsync() throws Exception {
        Payment payment = Payment.initiate(orderId, "order_abc", new BigDecimal("10.00"), BigDecimal.ZERO, "k");
        setId(payment, UUID.randomUUID());
        payment.markCaptured("pay_1");
        when(paymentRepository.findById(payment.getId())).thenReturn(Optional.of(payment));
        when(refundRequestRepository.findByPaymentIdAndStatus(payment.getId(),
                com.foodie.common.enums.RefundStatus.INITIATED)).thenReturn(List.of());
        when(razorpayClient.createRefund(eq("pay_1"), any(), any())).thenReturn(
                new RazorpayClient.RazorpayRefundResult("rfnd_1"));
        when(refundRequestRepository.save(any())).thenAnswer(inv -> {
            RefundRequest r = inv.getArgument(0);
            setId(r, UUID.randomUUID());
            return r;
        });

        var result = service.refund(
                payment.getId(),
                new RefundPaymentRequestDto(new BigDecimal("10.00"), "Restaurant reject"),
                UUID.randomUUID(),
                false);

        assertThat(result.status().name()).isEqualTo("INITIATED");
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CAPTURED);
    }

    private static void setId(Object entity, UUID id) {
        try {
            Class<?> type = entity.getClass();
            while (type != null) {
                try {
                    var field = type.getDeclaredField("id");
                    field.setAccessible(true);
                    field.set(entity, id);
                    return;
                } catch (NoSuchFieldException ex) {
                    type = type.getSuperclass();
                }
            }
        } catch (IllegalAccessException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
