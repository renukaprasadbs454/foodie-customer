package com.foodie.restaurant.repository;

import com.foodie.restaurant.entity.Restaurant;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RestaurantRepository extends JpaRepository<Restaurant, UUID> {

     boolean existsByOwnerUserCredentialId(UUID ownerUserCredentialId);

     Optional<Restaurant> findByOwnerUserCredentialId(UUID ownerUserCredentialId);

     java.util.List<Restaurant> findAllByStatus(com.foodie.common.enums.RestaurantStatus status);

     /**
      * JPQL search — works on both H2 (local) and PostgreSQL (production).
      * All @Param names are referenced in the query (Spring Data validates this).
      * The :cuisineType condition is a no-op that always evaluates to TRUE so the
      * caller's cuisine filter is applied post-query in the service layer.
      */
     @Query("SELECT r FROM Restaurant r"
               + " WHERE r.status = com.foodie.common.enums.RestaurantStatus.APPROVED"
               + " AND (:search IS NULL OR :search = ''"
               + "      OR LOWER(r.name) LIKE LOWER(CONCAT('%', :search, '%')))"
               + " AND (:minRating IS NULL OR r.avgRating >= :minRating)"
               + " AND (:cuisineType IS NULL OR :cuisineType IS NOT NULL)")
     Page<Restaurant> searchApproved(
               @Param("search") String search,
               @Param("cuisineType") String cuisineType,
               @Param("minRating") BigDecimal minRating,
               Pageable pageable);

     /**
      * JPQL geo search — works on both H2 and PostgreSQL.
      * Proximity ordering removed for H2 compatibility; service layer sorts by
      * distance if needed. All @Param names referenced to satisfy Spring validation.
      * lat/lng are declared as Double (nullable wrapper) so IS NULL check compiles.
      */
     @Query("SELECT r FROM Restaurant r"
               + " WHERE r.status = com.foodie.common.enums.RestaurantStatus.APPROVED"
               + " AND (:search IS NULL OR :search = ''"
               + "      OR LOWER(r.name) LIKE LOWER(CONCAT('%', :search, '%')))"
               + " AND (:minRating IS NULL OR r.avgRating >= :minRating)"
               + " AND (:cuisineType IS NULL OR :cuisineType IS NOT NULL)"
               + " AND (:lat IS NULL OR :lat IS NOT NULL)"
               + " AND (:lng IS NULL OR :lng IS NOT NULL)")
     Page<Restaurant> searchApprovedGeo(
               @Param("search") String search,
               @Param("cuisineType") String cuisineType,
               @Param("minRating") BigDecimal minRating,
               @Param("lat") Double lat,
               @Param("lng") Double lng,
               Pageable pageable);
}
