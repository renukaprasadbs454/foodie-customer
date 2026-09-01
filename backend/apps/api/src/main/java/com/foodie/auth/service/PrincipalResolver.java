package com.foodie.auth.service;

import com.foodie.security.jwt.JwtTokenProvider;
import com.foodie.security.principal.AuthPrincipal;
import org.springframework.stereotype.Component;

@Component
public class PrincipalResolver {

    private final JwtTokenProvider jwtTokenProvider;

    public PrincipalResolver(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public AuthPrincipal resolve(String jwt) {
        return jwtTokenProvider.parse(jwt);
    }
}
