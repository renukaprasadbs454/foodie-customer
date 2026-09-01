package com.foodie.cart.repository;

import com.foodie.cart.entity.CartItem;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    List<CartItem> findByCartIdOrderByCreatedAtAsc(UUID cartId);

    Optional<CartItem> findByIdAndCartId(UUID id, UUID cartId);

    Optional<CartItem> findByCartIdAndMenuItemIdAndVariantId(UUID cartId, UUID menuItemId, UUID variantId);

    Optional<CartItem> findByCartIdAndMenuItemIdAndVariantIdIsNull(UUID cartId, UUID menuItemId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CartItem i where i.cart.id = :cartId")
    void deleteAllByCartId(@Param("cartId") UUID cartId);
}
