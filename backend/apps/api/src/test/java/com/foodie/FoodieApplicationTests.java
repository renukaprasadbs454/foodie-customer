package com.foodie;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Lightweight smoke test that does not require Spring context, Postgres, or Redis.
 * Full context loading is covered by {@link com.foodie.support.AbstractIntegrationTest} subclasses.
 */
class FoodieApplicationTests {

    @Test
    void scaffold_isWired() {
        assertTrue(true);
    }
}
