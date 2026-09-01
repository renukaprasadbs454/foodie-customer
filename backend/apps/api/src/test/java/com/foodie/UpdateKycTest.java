package com.foodie;

import com.foodie.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

public class UpdateKycTest extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    public void executeUpdate() {
        int rows = jdbcTemplate.update(
                "UPDATE \"delivery_partner\" " +
                "SET \"kyc_status\" = 'VERIFIED' " +
                "WHERE CAST(\"user_credential_id\" AS VARCHAR) LIKE '4317a3a8-ed21%'"
        );

        System.out.println("========== UPDATED KYC ROWS: " + rows + " ==========");
    }
}