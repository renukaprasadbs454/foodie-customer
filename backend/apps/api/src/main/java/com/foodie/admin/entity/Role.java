package com.foodie.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "role")
public class Role {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "name", nullable = false, unique = true, length = 20)
    private AdminRoleName name;

    protected Role() {
    }

    /** Test/helper factory — roles are normally seeded via Flyway. */
    public static Role ref(UUID id, AdminRoleName name) {
        Role role = new Role();
        role.id = id;
        role.name = name;
        return role;
    }

    public UUID getId() {
        return id;
    }

    public AdminRoleName getName() {
        return name;
    }
}
