package com.foodie.order;

import static org.assertj.core.api.Assertions.assertThat;

import com.foodie.common.enums.OrderActorType;
import com.foodie.common.enums.OrderStatus;
import com.foodie.order.statemachine.OrderStateMachine;
import com.foodie.order.statemachine.OrderStateMachine.Decision;
import org.junit.jupiter.api.Test;

class OrderStateMachineTest {

    @Test
    void happyPath_systemAndRestaurant() {
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderActorType.SYSTEM))
                .isEqualTo(Decision.ALLOW);
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.CONFIRMED, OrderStatus.ACCEPTED, OrderActorType.RESTAURANT))
                .isEqualTo(Decision.ALLOW);
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderActorType.RESTAURANT))
                .isEqualTo(Decision.ALLOW);
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderActorType.RESTAURANT))
                .isEqualTo(Decision.ALLOW);
    }

    @Test
    void customerCancel_prePreparingOnly() {
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.PLACED, OrderStatus.CANCELLED, OrderActorType.CUSTOMER))
                .isEqualTo(Decision.ALLOW);
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.ACCEPTED, OrderStatus.CANCELLED, OrderActorType.CUSTOMER))
                .isEqualTo(Decision.ALLOW);
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderActorType.CUSTOMER))
                .isEqualTo(Decision.ILLEGAL);
    }

    @Test
    void restaurant_deliveryTransitionsForbidden() {
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.READY_FOR_PICKUP, OrderStatus.ASSIGNED, OrderActorType.RESTAURANT))
                .isEqualTo(Decision.FORBIDDEN);
    }

    @Test
    void restaurant_acceptedFromPlaced_illegal() {
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderActorType.RESTAURANT))
                .isEqualTo(Decision.ILLEGAL);
    }

    @Test
    void admin_overrideAllowed() {
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.PLACED, OrderStatus.READY_FOR_PICKUP, OrderActorType.ADMIN))
                .isEqualTo(Decision.ALLOW);
    }

    @Test
    void terminal_blocksFurtherTransitions() {
        assertThat(OrderStateMachine.evaluate(
                OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderActorType.ADMIN))
                .isEqualTo(Decision.ILLEGAL);
    }
}
