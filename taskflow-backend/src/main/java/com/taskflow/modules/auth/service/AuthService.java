package com.taskflow.modules.auth.service;

import com.taskflow.common.exception.InvalidCredentialsException;
import com.taskflow.common.security.JwtTokenProvider;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.dto.LoginRequest;
import com.taskflow.modules.auth.dto.LoginResponse;
import com.taskflow.modules.auth.dto.RegisterRequest;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.user.domain.UserProfile;
import com.taskflow.modules.user.repository.UserProfileRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserRepository userRepository,
                       UserProfileRepository userProfileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("User with this email already exists");
        }

        UUID orgId = request.getOrganizationId() != null ? request.getOrganizationId() : UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String role = request.getRole() != null ? request.getRole() : "ROLE_ORG_MEMBER";

        // Save auth user
        User user = User.builder()
                .id(userId)
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(role)
                .organizationId(orgId)
                .build();
        userRepository.save(user);

        // Save user profile directly
        UserProfile profile = UserProfile.builder()
                .id(userId)
                .email(request.getEmail())
                .name(request.getName())
                .role(role)
                .organizationId(orgId)
                .build();
        userProfileRepository.save(profile);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getOrganizationId(), user.getEmail(), user.getName(), user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .orgId(user.getOrganizationId())
                .email(user.getEmail())
                .name(user.getName())
                .build();
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getOrganizationId(), user.getEmail(), user.getName(), user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .orgId(user.getOrganizationId())
                .email(user.getEmail())
                .name(user.getName())
                .build();
    }

    @Transactional(readOnly = true)
    public LoginResponse refresh(String token) {
        if (!jwtTokenProvider.validateToken(token)) {
            throw new InvalidCredentialsException("Invalid or expired refresh token");
        }

        UUID userId = jwtTokenProvider.getUserIdFromToken(token);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidCredentialsException("User not found"));

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getOrganizationId(), user.getEmail(), user.getName(), user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .orgId(user.getOrganizationId())
                .email(user.getEmail())
                .name(user.getName())
                .build();
    }
}
