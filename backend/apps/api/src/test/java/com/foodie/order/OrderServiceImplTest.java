package com.foodie.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.common.enums.OrderStatus;
import com.foodie.common.enums.UserType;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.order.config.OrderProperties;
import com.foodie.order.dto.request.CreateOrderRequestDto;
import com.foodie.order.dto.response.OrderResponseDto;
import com.foodie.order.entity.Order;
import com.foodie.order.mapper.OrderMapper;
import com.foodie.order.repository.OrderItemRepository;
import com.foodie.order.repository.OrderRepository;
import com.foodie.order.repository.OrderStatusEventRepository;
import com.foodie.order.service.IdempotencyService;
import com.foodie.order.service.OrderNumberGenerator;
import com.foodie.order.service.impl.OrderServiceImpl;
import com.foodie.shared.contract.CartCheckoutPort;
import com.foodie.shared.contract.CouponService;
import com.foodie.shared.contract.CustomerAddressOwnershipQuery;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import com.foodie.shared.contract.MenuItemPriceProvider;
import com.foodie.shared.contract.RestaurantSummaryProvider;
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
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

        @Mock
        private OrderRepository orderRepository;
        @Mock
        private OrderItemRepository orderItemRepository;
        @Mock
        private OrderStatusEventRepository orderStatusEventRepository;
        @Mock
        private CartCheckoutPort cartCheckoutPort;
        @Mock
        private CustomerSummaryProvider customerSummaryProvider;
        @Mock
        private CustomerAddressOwnershipQuery addressOwnershipQuery;
        @Mock
        private RestaurantSummaryProvider restaurantSummaryProvider;
        @Mock
        private MenuItemPriceProvider menuItemPriceProvider;
        @Mock
        private DeliveryPartnerLookup deliveryPartnerLookup;
        @Mock
        private CouponService couponService;
        @Mock
        private IdempotencyService idempotencyService;
        @Mock
        private OrderNumberGenerator orderNumberGenerator;
        @Mock
        private ApplicationEventPublisher eventPublisher;
        @Mock
        private JdbcTemplate jdbcTemplate;

        private OrderServiceImpl service;
        private final UUID credentialId = UUID.randomUUID();
        private final UUID customerId = UUID.randomUUID();
        private final UUID restaurantId = UUID.randomUUID();
        private final UUID addressId = UUID.randomUUID();
        private final UUID menuItemId = UUID.randomUUID();

        @BeforeEach
        void setUp() {
                OrderProperties props = new OrderProperties();
                props.setDefaultDeliveryFee(new BigDecimal("30.00"));
                props.setTaxRate(new BigDecimal("0.05"));
                service = new OrderServiceImpl(
                                orderRepository,
                                orderItemRepository,
                                orderStatusEventRepository,
                                new OrderMapper(),
                                cartCheckoutPort,
                                customerSummaryProvider,
                                addressOwnershipQuery,
                                restaurantSummaryProvider,
                                menuItemPriceProvider,
                                deliveryPartnerLookup,
                                couponService,
                                idempotencyService,
                                orderNumberGenerator,
                                props,
                                eventPublisher,
                                jdbcTemplate);
        }

        @Test
        void createFromCart_missingIdempotencyKey_throws400() {
                assertThatThrownBy(() -> service.createFromCart(
                                credentialId, new CreateOrderRequestDto(addressId, null), null))
                                .isInstanceOf(BadRequestException.class)
                                .extracting(ex -> ((BadRequestException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.IDEMPOTENCY_KEY_REQUIRED);
        }

        @Test
        void createFromCart_emptyCart_throws422() {
                when(idempotencyService.findCachedResponse(any(), any())).thenReturn(Optional.empty());
                when(orderRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
                when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.of(
                                new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
                when(addressOwnershipQuery.isAddressOwnedByCustomer(addressId, customerId)).thenReturn(true);
                when(cartCheckoutPort.getCheckoutSnapshot(credentialId)).thenReturn(
                                new CartCheckoutPort.CartCheckoutSnapshot(
                                                UUID.randomUUID(), null, List.of(), BigDecimal.ZERO));

                assertThatThrownBy(() -> service.createFromCart(
                                credentialId, new CreateOrderRequestDto(addressId, null), UUID.randomUUID().toString()))
                                .isInstanceOf(UnprocessableEntityException.class)
                                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.CART_EMPTY);
        }

        @Test
        void createFromCart_snapshotsPricesAndClearsCart() {
                String key = UUID.randomUUID().toString();
                when(idempotencyService.findCachedResponse(any(), any())).thenReturn(Optional.empty());
                when(orderRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
                when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.of(
                                new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
                when(addressOwnershipQuery.isAddressOwnedByCustomer(addressId, customerId)).thenReturn(true);
                when(cartCheckoutPort.getCheckoutSnapshot(credentialId)).thenReturn(
                                new CartCheckoutPort.CartCheckoutSnapshot(
                                                UUID.randomUUID(),
                                                restaurantId,
                                                List.of(new CartCheckoutPort.Line(
                                                                menuItemId, null, 2, new BigDecimal("220.00"),
                                                                new BigDecimal("440.00"))),
                                                new BigDecimal("440.00")));
                when(menuItemPriceProvider.getPriceSnapshot(menuItemId, null)).thenReturn(Optional.of(
                                new MenuItemPriceProvider.MenuItemPriceSnapshot(
                                                menuItemId, null, restaurantId, new BigDecimal("220.00"), true,
                                                "Paneer Tikka")));
                when(orderNumberGenerator.next()).thenReturn("FD-20260801-000123");
                when(orderRepository.saveAndFlush(any())).thenAnswer(inv -> {
                        Order order = inv.getArgument(0);
                        setId(order, UUID.randomUUID());
                        return order;
                });
                when(orderItemRepository.findByOrderIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
                when(orderStatusEventRepository.findByOrderIdOrderByCreatedAtAsc(any())).thenReturn(List.of());

                OrderResponseDto created = service.createFromCart(
                                credentialId, new CreateOrderRequestDto(addressId, null), key);

                assertThat(created.status()).isEqualTo(OrderStatus.PLACED);
                assertThat(created.orderNumber()).isEqualTo("FD-20260801-000123");
                assertThat(created.subtotal()).isEqualByComparingTo("440.00");
                assertThat(created.deliveryFee()).isEqualByComparingTo("30.00");
                assertThat(created.taxAmount()).isEqualByComparingTo("22.00");
                assertThat(created.totalAmount()).isEqualByComparingTo("492.00");
                verify(cartCheckoutPort).clearCart(credentialId);
                verify(idempotencyService).store(eq(key), any(), any());
        }

        @Test
        void createFromCart_couponPresent_appliesDiscountViaCouponService() {
                String key = UUID.randomUUID().toString();
                UUID couponId = UUID.randomUUID();
                when(idempotencyService.findCachedResponse(any(), any())).thenReturn(Optional.empty());
                when(orderRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
                when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.of(
                                new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
                when(addressOwnershipQuery.isAddressOwnedByCustomer(addressId, customerId)).thenReturn(true);
                when(cartCheckoutPort.getCheckoutSnapshot(credentialId)).thenReturn(
                                new CartCheckoutPort.CartCheckoutSnapshot(
                                                UUID.randomUUID(),
                                                restaurantId,
                                                List.of(new CartCheckoutPort.Line(
                                                                menuItemId, null, 2, new BigDecimal("220.00"),
                                                                new BigDecimal("440.00"))),
                                                new BigDecimal("440.00")));
                when(menuItemPriceProvider.getPriceSnapshot(menuItemId, null)).thenReturn(Optional.of(
                                new MenuItemPriceProvider.MenuItemPriceSnapshot(
                                                menuItemId, null, restaurantId, new BigDecimal("220.00"), true,
                                                "Paneer Tikka")));
                when(couponService.apply(eq("WELCOME50"), eq(customerId), eq(restaurantId), any()))
                                .thenReturn(new CouponService.DiscountResult(
                                                couponId, "WELCOME50", new BigDecimal("50.00"),
                                                new BigDecimal("390.00")));
                when(orderNumberGenerator.next()).thenReturn("FD-20260801-000999");
                when(orderRepository.saveAndFlush(any())).thenAnswer(inv -> {
                        Order order = inv.getArgument(0);
                        setId(order, UUID.randomUUID());
                        return order;
                });
                when(orderItemRepository.findByOrderIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
                when(orderStatusEventRepository.findByOrderIdOrderByCreatedAtAsc(any())).thenReturn(List.of());

                OrderResponseDto created = service.createFromCart(
                                credentialId, new CreateOrderRequestDto(addressId, "WELCOME50"), key);

                assertThat(created.discountAmount()).isEqualByComparingTo("50.00");
                assertThat(created.totalAmount()).isEqualByComparingTo("442.00");
                ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
                verify(orderRepository).saveAndFlush(orderCaptor.capture());
                assertThat(orderCaptor.getValue().getCouponId()).isEqualTo(couponId);
        }

        @Test
        void createFromCart_couponRejectedByCouponService_propagates() {
                when(idempotencyService.findCachedResponse(any(), any())).thenReturn(Optional.empty());
                when(orderRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
                when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.of(
                                new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));
                when(addressOwnershipQuery.isAddressOwnedByCustomer(addressId, customerId)).thenReturn(true);
                when(cartCheckoutPort.getCheckoutSnapshot(credentialId)).thenReturn(
                                new CartCheckoutPort.CartCheckoutSnapshot(
                                                UUID.randomUUID(),
                                                restaurantId,
                                                List.of(new CartCheckoutPort.Line(
                                                                menuItemId, null, 1, new BigDecimal("100.00"),
                                                                new BigDecimal("100.00"))),
                                                new BigDecimal("100.00")));
                when(menuItemPriceProvider.getPriceSnapshot(menuItemId, null)).thenReturn(Optional.of(
                                new MenuItemPriceProvider.MenuItemPriceSnapshot(
                                                menuItemId, null, restaurantId, new BigDecimal("100.00"), true,
                                                "Item")));
                when(couponService.apply(any(), any(), any(), any()))
                                .thenThrow(new UnprocessableEntityException(
                                                ErrorCode.COUPON_EXPIRED, "Coupon has expired."));

                assertThatThrownBy(() -> service.createFromCart(
                                credentialId, new CreateOrderRequestDto(addressId, "OLD50"), "k1"))
                                .isInstanceOf(UnprocessableEntityException.class)
                                .extracting(ex -> ((UnprocessableEntityException) ex).getErrorCode())
                                .isEqualTo(ErrorCode.COUPON_EXPIRED);
                verify(orderRepository, never()).saveAndFlush(any());
        }

        @Test
        void transition_customerCancelRequiresReason() {
                Order order = Order.place(
                                "FD-1", customerId, restaurantId, addressId,
                                new BigDecimal("10.00"), new BigDecimal("30.00"), BigDecimal.ZERO,
                                new BigDecimal("0.50"), new BigDecimal("40.50"), "key");
                setId(order, UUID.randomUUID());
                when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
                when(customerSummaryProvider.findByUserCredentialId(credentialId)).thenReturn(Optional.of(
                                new CustomerSummaryProvider.CustomerSummary(customerId, "A", null)));

                assertThatThrownBy(() -> service.transition(
                                order.getId(), OrderStatus.CANCELLED, null, credentialId, UserType.CUSTOMER))
                                .isInstanceOf(BadRequestException.class);
        }

        @Test
        void confirmAfterPayment_transitionsPlacedToConfirmed() {
                Order order = Order.place(
                                "FD-1", customerId, restaurantId, addressId,
                                new BigDecimal("10.00"), new BigDecimal("30.00"), BigDecimal.ZERO,
                                new BigDecimal("0.50"), new BigDecimal("40.50"), "key");
                setId(order, UUID.randomUUID());
                when(orderRepository.findById(order.getId())).thenReturn(Optional.of(order));
                when(orderItemRepository.findByOrderIdOrderByCreatedAtAsc(order.getId())).thenReturn(List.of());
                when(orderStatusEventRepository.findByOrderIdOrderByCreatedAtAsc(order.getId())).thenReturn(List.of());

                OrderResponseDto view = service.confirmAfterPayment(order.getId());

                assertThat(view.status()).isEqualTo(OrderStatus.CONFIRMED);
                ArgumentCaptor<com.foodie.order.entity.OrderStatusEvent> captor = ArgumentCaptor
                                .forClass(com.foodie.order.entity.OrderStatusEvent.class);
                verify(orderStatusEventRepository).save(captor.capture());
                assertThat(captor.getValue().getToStatus()).isEqualTo(OrderStatus.CONFIRMED);
        }

        private static void setId(Object entity, UUID id) {
                try {
                        var field = entity.getClass().getSuperclass().getDeclaredField("id");
                        if (!field.canAccess(entity)) {
                                field = entity.getClass().getDeclaredField("id");
                        }
                } catch (NoSuchFieldException ignored) {
                        // BaseEntity id
                }
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
