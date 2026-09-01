package com.foodie.admin.dto.request;

import com.foodie.admin.entity.AdminRoleName;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateAdminUserRequestDto(
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Pattern(regexp = "^\\+?[0-9]{10,15}$") String phoneNumber,
        @Size(max = 255) String email,
        @NotNull AdminRoleName role
) {
}
