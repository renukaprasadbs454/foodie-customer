package com.foodie.admin.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an admin-facing controller method for append-only audit_log writes (Phase3 §19.4).
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditableAction {

    String action();

    String resourceType();

    /** SpEL evaluating to UUID resource id; default uses path variable {@code id}. */
    String resourceId() default "";
}
