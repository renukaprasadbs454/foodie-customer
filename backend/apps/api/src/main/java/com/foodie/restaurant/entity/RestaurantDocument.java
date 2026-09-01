package com.foodie.restaurant.entity;

import com.foodie.common.entity.BaseEntity;
import com.foodie.common.enums.RestaurantDocType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "restaurant_document")
public class RestaurantDocument extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false, updatable = false)
    private Restaurant restaurant;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 20)
    private RestaurantDocType docType;

    @Column(name = "s3_key", nullable = false, length = 500)
    private String s3Key;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    protected RestaurantDocument() {
    }

    public static RestaurantDocument create(Restaurant restaurant, RestaurantDocType docType, String s3Key) {
        RestaurantDocument document = new RestaurantDocument();
        document.restaurant = restaurant;
        document.docType = docType;
        document.s3Key = s3Key;
        document.verifiedAt = null;
        return document;
    }

    public void markVerified() {
        this.verifiedAt = Instant.now();
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public RestaurantDocType getDocType() {
        return docType;
    }

    public String getS3Key() {
        return s3Key;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }
}
