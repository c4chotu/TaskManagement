package com.taskflow.modules.user.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.modules.user.domain.UserProfile;
import com.taskflow.modules.user.dto.UpdateProfileRequest;
import com.taskflow.modules.user.dto.UserProfileResponse;
import com.taskflow.modules.user.repository.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;

    public UserProfileService(UserProfileRepository userProfileRepository) {
        this.userProfileRepository = userProfileRepository;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        UserProfile profile = userProfileRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User profile not found for ID: " + userId));
        return mapToResponse(profile);
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

    private UserProfileResponse mapToResponse(UserProfile profile) {
        return UserProfileResponse.builder()
                .id(profile.getId())
                .email(profile.getEmail())
                .name(profile.getName())
                .role(profile.getRole())
                .organizationId(profile.getOrganizationId())
                .avatarUrl(profile.getAvatarUrl())
                .bio(profile.getBio())
                .build();
    }
}
