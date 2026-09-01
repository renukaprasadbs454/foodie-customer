package com.foodie;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;

public class ApproveRestaurant {
    public static void main(String[] args) {
        String url = "jdbc:h2:file:c:/Users/hp/OneDrive/Desktop/foodie/foodie-backend/apps/api/data/foodie-db;AUTO_SERVER=TRUE;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DEFAULT_NULL_ORDERING=HIGH;NON_KEYWORDS=VALUE";
        String user = "sa";
        String password = "";

        try {
            Class.forName("org.h2.Driver");
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            String queryId = "SELECT \"id\" FROM \"user_credential\" WHERE \"phone_number\" = '+919686753394'";
            String userId = null;
            try (Statement s = conn.createStatement(); java.sql.ResultSet rs = s.executeQuery(queryId)) {
                if (rs.next()) {
                    userId = rs.getString(1);
                    System.out.println("Found user ID: " + userId);
                } else {
                    System.out.println("User not found: +919686753394");
                }
            }
            if (userId != null) {
                String q = "UPDATE \"restaurant\" SET \"status\" = 'APPROVED'";
                try (Statement s = conn.createStatement()) {
                    int count = s.executeUpdate(q);
                    System.out.println("Rows updated: " + count);
                }
            }
        } catch (Exception e) {
            System.out.println("ERROR: " + e.getMessage());
        }
    }
}
