package com.foodie.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.foodie.notification.service.TemplateRenderer;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TemplateRendererTest {

    private final TemplateRenderer renderer = new TemplateRenderer();

    @Test
    void replacesPlaceholders() {
        String out = renderer.render("Order {{orderNumber}} is {{toStatus}}", Map.of(
                "orderNumber", "FD-1",
                "toStatus", "PREPARING"
        ));
        assertThat(out).isEqualTo("Order FD-1 is PREPARING");
    }

    @Test
    void nullParams_returnsTemplate() {
        assertThat(renderer.render("Hello", null)).isEqualTo("Hello");
    }
}
