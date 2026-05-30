package com.taskflow.modules.user.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.domain.UserRole;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.auth.repository.UserRoleRepository;
import com.taskflow.modules.auth.service.RoleHierarchyService;
import com.taskflow.modules.user.domain.UserProfile;
import com.taskflow.modules.user.dto.UpdateProfileRequest;
import com.taskflow.modules.user.dto.UserProfileResponse;
import com.taskflow.modules.user.repository.UserProfileRepository;
import com.taskflow.modules.user.repository.TeamMemberRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;
    private final RoleHierarchyService roleHierarchyService;
    private final PasswordEncoder passwordEncoder;
    private final TeamMemberRepository teamMemberRepository;

    public UserProfileService(UserProfileRepository userProfileRepository,
                              UserRoleRepository userRoleRepository,
                              UserRepository userRepository,
                              RoleHierarchyService roleHierarchyService,
                              PasswordEncoder passwordEncoder,
                              TeamMemberRepository teamMemberRepository) {
        this.userProfileRepository = userProfileRepository;
        this.userRoleRepository = userRoleRepository;
        this.userRepository = userRepository;
        this.roleHierarchyService = roleHierarchyService;
        this.passwordEncoder = passwordEncoder;
        this.teamMemberRepository = teamMemberRepository;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        UserProfile profile = userProfileRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User profile not found for ID: " + userId));
        return mapToResponse(profile);
    }

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getUsersByOrganization(UUID orgId) {
        return userProfileRepository.findByOrganizationId(orgId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserProfileResponse getOrCreateProfile(UUID userId, String email, String name, String role, UUID orgId) {
        UserProfile profile = userProfileRepository.findById(userId)
                .orElseGet(() -> {
                    UserProfile newProfile = UserProfile.builder()
                            .id(userId)
                            .email(email)
                            .name(name)
                            .role(role)
                            .organizationId(orgId)
                            .build();
                    return userProfileRepository.save(newProfile);
                });
        return mapToResponse(profile);
    }

    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        UserProfile profile = userProfileRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User profile not found for ID: " + userId));

        profile.setName(request.getName());
        profile.setAvatarUrl(request.getAvatarUrl());
        profile.setBio(request.getBio());

        UserProfile updated = userProfileRepository.save(profile);
        return mapToResponse(updated);
    }

    @Transactional
    public UserProfileResponse promoteUser(UUID userId, String newRoleName, int newRoleLevel, UUID actorId) {
        // 1. Assign role in hierarchy (checks L+2 constraints and saves UserRole)
        roleHierarchyService.assignRole(userId, newRoleLevel, newRoleName, null, null, actorId);

        // 2. Update principal User auth record (for spring security authorities mapping)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        String springRole = "ROLE_" + newRoleName;
        user.setRole(springRole);
        userRepository.save(user);

        // 3. Update UserProfile record
        UserProfile profile = userProfileRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User profile not found: " + userId));
        profile.setRole(springRole);
        UserProfile updated = userProfileRepository.save(profile);

        return mapToResponse(updated);
    }

    @Transactional
    public UserProfileResponse createUser(
            String name,
            String email,
            String password,
            String roleName,
            UUID orgId,
            UUID teamId,
            UUID departmentId,
            UUID actorId
    ) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("User with this email already exists");
        }

        UUID userId = UUID.randomUUID();
        String springRole = "ROLE_" + roleName;

        // Save auth user
        User user = User.builder()
                .id(userId)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .name(name)
                .role(springRole)
                .organizationId(orgId)
                .build();
        userRepository.save(user);

        // Save user profile
        UserProfile profile = UserProfile.builder()
                .id(userId)
                .email(email)
                .name(name)
                .role(springRole)
                .organizationId(orgId)
                .build();
        userProfileRepository.save(profile);

        // Assign UserRole (hierarchy role)
        roleHierarchyService.assignRole(userId, mapRoleNameToLevel(roleName), roleName, departmentId, teamId, actorId);

        // Add to TeamMember if teamId is set
        if (teamId != null) {
            com.taskflow.modules.user.domain.TeamMember tm = com.taskflow.modules.user.domain.TeamMember.builder()
                    .id(UUID.randomUUID())
                    .teamId(teamId)
                    .userId(userId)
                    .role("TEAM_LEAD".equalsIgnoreCase(roleName) ? "LEAD" : "MEMBER")
                    .build();
            teamMemberRepository.save(tm);
        }

        return mapToResponse(profile);
    }

    private UserProfileResponse mapToResponse(UserProfile profile) {
        String roleName = cleanRoleName(profile.getRole());
        int roleLevel = mapRoleNameToLevel(profile.getRole());

        if (profile.getOrganizationId() != null) {
            List<UserRole> roles = userRoleRepository.findByUserIdAndOrganizationId(profile.getId(), profile.getOrganizationId());
            if (roles != null && !roles.isEmpty()) {
                UserRole maxRole = roles.stream()
                        .max(Comparator.comparingInt(UserRole::getRoleLevel))
                        .orElse(null);
                if (maxRole != null) {
                    roleLevel = maxRole.getRoleLevel();
                    roleName = maxRole.getRoleName();
                }
            }
        }

        return UserProfileResponse.builder()
                .id(profile.getId())
                .email(profile.getEmail())
                .name(profile.getName())
                .role(profile.getRole())
                .organizationId(profile.getOrganizationId())
                .avatarUrl(profile.getAvatarUrl())
                .bio(profile.getBio())
                .roleName(roleName)
                .roleLevel(roleLevel)
                .build();
    }

    private int mapRoleNameToLevel(String roleName) {
        if (roleName == null) return 1;
        switch (roleName.toUpperCase()) {
            case "ORG_OWNER":
            case "ROLE_ORG_OWNER":
            case "OWNER":
                return 5;
            case "ORG_ADMIN":
            case "ROLE_ORG_ADMIN":
            case "ADMIN":
                return 4;
            case "DEPT_HEAD":
            case "ROLE_DEPT_HEAD":
                return 3;
            case "TEAM_LEAD":
            case "ROLE_TEAM_LEAD":
                return 2;
            case "TEAM_MEMBER":
            case "ROLE_ORG_MEMBER":
            case "ROLE_TEAM_MEMBER":
            case "MEMBER":
                return 1;
            case "GUEST":
            case "ROLE_GUEST":
                return 0;
            default:
                return 1;
        }
    }

    private String cleanRoleName(String roleName) {
        if (roleName == null) return "TEAM_MEMBER";
        String clean = roleName.toUpperCase();
        if (clean.startsWith("ROLE_")) {
            clean = clean.substring(5);
        }
        if (clean.equals("OWNER")) return "ORG_OWNER";
        if (clean.equals("ADMIN")) return "ORG_ADMIN";
        if (clean.equals("MEMBER")) return "TEAM_MEMBER";
        return clean;
    }
}
