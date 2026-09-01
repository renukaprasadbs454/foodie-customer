package com.foodie.notification.service;

import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class TemplateRenderer {

    public String render(String template, Map<String, String> params) {
        if (template == null) {
            return "";
        }
        String result = template;
        if (params != null) {
            for (Map.Entry<String, String> entry : params.entrySet()) {
                String value = entry.getValue() == null ? "" : entry.getValue();
                result = result.replace("{{" + entry.getKey() + "}}", value);
            }
        }
        return result;
    }
}
