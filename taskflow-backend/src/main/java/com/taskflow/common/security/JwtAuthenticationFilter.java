package com.taskflow.common.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
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
                    UUID userId = jwtTokenProvider.getUserIdFromToken(token);
                    Claims claims = jwtTokenProvider.getClaimsFromToken(token);
                    String email = claims.get("email", String.class);
                    String name = claims.get("name", String.class);
                    String orgIdStr = claims.get("org_id", String.class);
                    String role = claims.get("role", String.class);

                    AuthenticatedUser user = AuthenticatedUser.builder()
                            .id(userId)
                            .email(email)
                            .name(name)
                            .orgId(orgIdStr != null ? UUID.fromString(orgIdStr) : null)
                            .role(role != null ? role : "ROLE_ORG_MEMBER")
                            .build();

                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            user, null, new ArrayList<>()
                    );
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } catch (Exception e) {
                    // Ignore parsing error, proceed unauthenticated
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
