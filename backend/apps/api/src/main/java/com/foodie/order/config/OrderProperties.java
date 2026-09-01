package com.foodie.order.config;

import java.math.BigDecimal;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "foodie.order")
public class OrderProperties {

    private BigDecimal defaultDeliveryFee = new BigDecimal("30.00");
    private BigDecimal taxRate = new BigDecimal("0.05");

    public BigDecimal getDefaultDeliveryFee() {
        return defaultDeliveryFee;
    }

    public void setDefaultDeliveryFee(BigDecimal defaultDeliveryFee) {
        this.defaultDeliveryFee = defaultDeliveryFee;
    }

    public BigDecimal getTaxRate() {
        return taxRate;
    }

    public void setTaxRate(BigDecimal taxRate) {
        this.taxRate = taxRate;
    }
}
