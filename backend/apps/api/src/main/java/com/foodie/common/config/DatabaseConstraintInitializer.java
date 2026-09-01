package com.foodie.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseConstraintInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConstraintInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseConstraintInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            log.info("Updating wallet_account check constraints for CUSTOMER owner_type...");
            jdbcTemplate.execute("ALTER TABLE wallet_account DROP CONSTRAINT IF EXISTS chk_wallet_owner_type");
            jdbcTemplate.execute(
                    "ALTER TABLE wallet_account ADD CONSTRAINT chk_wallet_owner_type CHECK (owner_type IN ('DELIVERY_PARTNER', 'PLATFORM', 'CUSTOMER'))");
        } catch (Exception e) {
            log.warn("Could not alter wallet_account check constraint: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE payment DROP CONSTRAINT IF EXISTS chk_payment_amount");
            jdbcTemplate.execute("ALTER TABLE payment ADD CONSTRAINT chk_payment_amount CHECK (amount >= 0)");
        } catch (Exception e) {
            log.warn("Could not alter payment check constraint: {}", e.getMessage());
        }
    }
}
