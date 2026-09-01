package com.foodie.menu.repository;

import com.foodie.menu.entity.Variant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VariantRepository extends JpaRepository<Variant, UUID> {

    List<Variant> findByMenuItemIdOrderByCreatedAtAsc(UUID menuItemId);

    List<Variant> findByMenuItemIdInOrderByCreatedAtAsc(Collection<UUID> menuItemIds);

    Optional<Variant> findByIdAndMenuItemId(UUID id, UUID menuItemId);
}
