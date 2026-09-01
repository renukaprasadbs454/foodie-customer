package com.foodie.order.statemachine;

import com.foodie.common.enums.OrderActorType;
import com.foodie.common.enums.OrderStatus;

/**
 * Binding order state machine (API Contracts MODULE 6 + Phase3 §10).
 */
public final class OrderStateMachine {

    public enum Decision {
        ALLOW,
        FORBIDDEN,
        ILLEGAL
    }

    private OrderStateMachine() {
    }

    public static boolean isTerminal(OrderStatus status) {
        return status == OrderStatus.DELIVERED
                || status == OrderStatus.CANCELLED
                || status == OrderStatus.REJECTED;
    }

    public static boolean isPrePreparing(OrderStatus status) {
        return status == OrderStatus.PLACED
                || status == OrderStatus.CONFIRMED
                || status == OrderStatus.ACCEPTED;
    }

    public static Decision evaluate(OrderStatus from, OrderStatus to, OrderActorType actor) {
        if (from == null || to == null || from == to || isTerminal(from)) {
            return Decision.ILLEGAL;
        }

        if (actor == OrderActorType.ADMIN) {
            return Decision.ALLOW;
        }

        if (actor == OrderActorType.CUSTOMER) {
            if (to == OrderStatus.CANCELLED) {
                return isPrePreparing(from) ? Decision.ALLOW : Decision.ILLEGAL;
            }
            return Decision.FORBIDDEN;
        }

        if (actor == OrderActorType.RESTAURANT) {
            return switch (to) {
                case ACCEPTED -> from == OrderStatus.CONFIRMED ? Decision.ALLOW : Decision.ILLEGAL;
                case REJECTED -> from == OrderStatus.CONFIRMED ? Decision.ALLOW : Decision.ILLEGAL;
                case PREPARING -> from == OrderStatus.ACCEPTED ? Decision.ALLOW : Decision.ILLEGAL;
                case READY_FOR_PICKUP -> from == OrderStatus.PREPARING ? Decision.ALLOW : Decision.ILLEGAL;
                default -> Decision.FORBIDDEN;
            };
        }

        if (actor == OrderActorType.SYSTEM) {
            return isSystemEdge(from, to) ? Decision.ALLOW : Decision.ILLEGAL;
        }

        // DELIVERY partners use Delivery-module endpoints, not this PATCH
        return Decision.FORBIDDEN;
    }

    private static boolean isSystemEdge(OrderStatus from, OrderStatus to) {
        return (from == OrderStatus.PLACED && to == OrderStatus.CONFIRMED)
                || (from == OrderStatus.READY_FOR_PICKUP && to == OrderStatus.ASSIGNED)
                || (from == OrderStatus.ASSIGNED && to == OrderStatus.PICKED_UP)
                || (from == OrderStatus.PICKED_UP && to == OrderStatus.OUT_FOR_DELIVERY)
                || (from == OrderStatus.OUT_FOR_DELIVERY && to == OrderStatus.DELIVERED);
    }
}
