package com.taskflow.common.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class OrgContextFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    public OrgContextFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtTokenProvider.validateToken(token)) {
                try {
                    Claims claims = jwtTokenProvider.getClaimsFromToken(token);
                    String orgIdStr = claims.get("org_id", String.class);
                    if (orgIdStr != null) {
                        OrgContextHolder.set(UUID.fromString(orgIdStr));
                    }
                } catch (Exception e) {
                    // Log or handle context parse exception silently
                }
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            OrgContextHolder.clear();
        }
    }
}
