package com.taskflow.modules.auth.controller;

import com.taskflow.common.security.AuthenticatedUser;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.auth.domain.Organization;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.domain.UserRole;
import com.taskflow.modules.auth.repository.OrganizationRepository;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.auth.repository.UserRoleRepository;
import com.taskflow.modules.auth.domain.PlanTier;
import com.taskflow.modules.auth.repository.PlanTierRepository;
import com.taskflow.modules.user.repository.UserProfileRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.repository.IssueDetailRepository;
import com.taskflow.modules.task.repository.CustomTaskStatusRepository;
import com.taskflow.modules.task.domain.CustomTaskStatus;
import lombok.Builder;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/superadmin")
public class SuperAdminController {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PlanTierRepository planTierRepository;
    private final UserProfileRepository userProfileRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final IssueDetailRepository issueDetailRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final PasswordEncoder passwordEncoder;

    public SuperAdminController(OrganizationRepository organizationRepository,
                                UserRepository userRepository,
                                UserRoleRepository userRoleRepository,
                                PlanTierRepository planTierRepository,
                                UserProfileRepository userProfileRepository,
                                ProjectRepository projectRepository,
                                TaskRepository taskRepository,
                                IssueDetailRepository issueDetailRepository,
                                CustomTaskStatusRepository customTaskStatusRepository,
                                PasswordEncoder passwordEncoder) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.planTierRepository = planTierRepository;
        this.userProfileRepository = userProfileRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.issueDetailRepository = issueDetailRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.passwordEncoder = passwordEncoder;
    }

    private void checkSuperAdmin() {
        AuthenticatedUser user = SecurityContextHelper.getCurrentUser();
        if (user == null || !"ROLE_SUPER_ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new com.taskflow.common.exception.UnauthorizedException("Super admin access required");
        }
    }

    @GetMapping("/organizations")
    public ResponseEntity<List<OrgStatsResponse>> listOrganizations() {
        checkSuperAdmin();
        List<Organization> orgs = organizationRepository.findAll();
        List<OrgStatsResponse> responses = new ArrayList<>();

        List<CustomTaskStatus> allStatuses = customTaskStatusRepository.findAll();
        Set<UUID> completedStatusIds = new HashSet<>();
        for (CustomTaskStatus cts : allStatuses) {
            if ("COMPLETED".equalsIgnoreCase(cts.getCategory())) {
                completedStatusIds.add(cts.getId());
            }
        }

        List<PlanTier> tiers = planTierRepository.findAll();

        for (Organization org : orgs) {
            UUID orgId = org.getId();
            long memberCount = userRepository.countByOrganizationId(orgId);
            long projectCount = projectRepository.findByOrganizationId(orgId).size();
            long taskCount = taskRepository.findByOrganizationIdAndDeletedAtIsNull(orgId).size();
            long issueCount = issueDetailRepository.findByOrganizationId(orgId).size();

            // Calculate load insights
            long activeTasks = taskRepository.findByOrganizationIdAndDeletedAtIsNull(orgId).stream()
                    .filter(t -> t.getStatusId() == null || !completedStatusIds.contains(t.getStatusId()))
                    .count();

            Map<String, Object> insights = new HashMap<>();
            insights.put("activeTasks", activeTasks);
            insights.put("averageCompletionRate", taskCount > 0 ? ((taskCount - activeTasks) * 100.0) / taskCount : 0.0);

            PlanTier tier = tiers.stream()
                    .filter(t -> t.getName().equalsIgnoreCase(org.getPricingTier()))
                    .findFirst()
                    .orElse(null);
            BigDecimal revenue = tier != null ? tier.getPriceMonthlyUsd() : BigDecimal.ZERO;

            responses.add(OrgStatsResponse.builder()
                    .id(orgId)
                    .name(org.getName())
                    .pricingTier(org.getPricingTier())
                    .status(org.getStatus())
                    .createdAt(org.getCreatedAt())
                    .memberCount(memberCount)
                    .projectCount(projectCount)
                    .taskCount(taskCount)
                    .issueCount(issueCount)
                    .insights(insights)
                    .revenue(revenue)
                    .build());
        }
        return ResponseEntity.ok(responses);
    }

    @Data
    @Builder
    public static class OrgDetailsResponse {
        private Organization organization;
        private List<User> users;
        private List<com.taskflow.modules.project.domain.Project> projects;
        private Map<String, Object> stats;
    }

    @GetMapping("/organizations/{orgId}")
    public ResponseEntity<OrgDetailsResponse> getOrganizationDetails(@PathVariable UUID orgId) {
        checkSuperAdmin();
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
        
        List<User> users = userRepository.findByOrganizationId(orgId);
        List<com.taskflow.modules.project.domain.Project> projects = projectRepository.findByOrganizationId(orgId);
        
        long taskCount = taskRepository.findByOrganizationIdAndDeletedAtIsNull(orgId).size();
        long issueCount = issueDetailRepository.findByOrganizationId(orgId).size();

        Map<String, Object> stats = Map.of(
            "taskCount", taskCount,
            "issueCount", issueCount
        );

        return ResponseEntity.ok(OrgDetailsResponse.builder()
                .organization(org)
                .users(users)
                .projects(projects)
                .stats(stats)
                .build());
    }

    @PutMapping("/organizations/{orgId}")
    public ResponseEntity<Organization> updateOrganizationDetails(@PathVariable UUID orgId, @RequestBody Map<String, String> body) {
        checkSuperAdmin();
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
        
        if (body.containsKey("name")) org.setName(body.get("name"));
        if (body.containsKey("pricingTier")) org.setPricingTier(body.get("pricingTier").toUpperCase());
        if (body.containsKey("status")) org.setStatus(body.get("status").toUpperCase());
        
        return ResponseEntity.ok(organizationRepository.save(org));
    }

    @PostMapping("/organizations")
    public ResponseEntity<Organization> onboardOrganization(@RequestBody OnboardOrgRequest request) {
        checkSuperAdmin();

        UUID orgId = UUID.randomUUID();
        Organization org = Organization.builder()
                .id(orgId)
                .name(request.getOrgName())
                .pricingTier(request.getPricingTier() != null ? request.getPricingTier().toUpperCase() : "FREE")
                .build();
        org = organizationRepository.save(org);

        UUID adminId = UUID.randomUUID();
        String passHash = passwordEncoder.encode(request.getAdminPassword());

        User adminUser = User.builder()
                .id(adminId)
                .email(request.getAdminEmail())
                .name(request.getAdminName())
                .passwordHash(passHash)
                .role("ROLE_ORG_OWNER")
                .organizationId(orgId)
                .build();
        userRepository.save(adminUser);

        com.taskflow.modules.user.domain.UserProfile profile = com.taskflow.modules.user.domain.UserProfile.builder()
                .id(adminId)
                .email(request.getAdminEmail())
                .name(request.getAdminName())
                .role("ROLE_ORG_OWNER")
                .organizationId(orgId)
                .bio("Primary Organization Owner")
                .build();
        userProfileRepository.save(profile);

        UserRole adminRole = UserRole.builder()
                .id(UUID.randomUUID())
                .userId(adminId)
                .organizationId(orgId)
                .roleLevel(5)
                .roleName("ORG_OWNER")
                .build();
        userRoleRepository.save(adminRole);

        return ResponseEntity.ok(org);
    }

    @GetMapping("/plans")
    public ResponseEntity<List<PlanTier>> getPlans() {
        checkSuperAdmin();
        return ResponseEntity.ok(planTierRepository.findAll());
    }

    @PostMapping("/plans")
    public ResponseEntity<PlanTier> createOrUpdatePlan(@RequestBody PlanTier req) {
        checkSuperAdmin();
        if (req.getId() == null) req.setId(UUID.randomUUID());
        
        PlanTier existing = planTierRepository.findByName(req.getName().toUpperCase()).orElse(null);
        if (existing != null) {
            existing.setMaxUsers(req.getMaxUsers());
            existing.setMaxProjects(req.getMaxProjects());
            existing.setMaxStorageGb(req.getMaxStorageGb());
            existing.setPriceMonthlyUsd(req.getPriceMonthlyUsd());
            existing.setFeatures(req.getFeatures());
            return ResponseEntity.ok(planTierRepository.save(existing));
        } else {
            req.setName(req.getName().toUpperCase());
            return ResponseEntity.ok(planTierRepository.save(req));
        }
    }

    @PutMapping("/organizations/{orgId}/plan")
    public ResponseEntity<?> updateOrganizationPlan(@PathVariable UUID orgId, @RequestBody Map<String, String> body) {
        checkSuperAdmin();
        String newTier = body.get("tier");
        if (newTier == null) return ResponseEntity.badRequest().body("Tier is required");
        
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
                
        PlanTier tier = planTierRepository.findByName(newTier.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Plan tier not found"));
                
        org.setPricingTier(tier.getName());
        organizationRepository.save(org);
        
        return ResponseEntity.ok(Map.of("message", "Plan updated successfully", "org", org));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStats() {
        checkSuperAdmin();
        long totalOrgs = organizationRepository.count();
        long totalUsers = userRepository.count();
        
        List<PlanTier> tiers = planTierRepository.findAll();
        List<Organization> orgs = organizationRepository.findAll();
        
        BigDecimal estimatedMrr = BigDecimal.ZERO;
        for (Organization org : orgs) {
            PlanTier tier = tiers.stream()
                    .filter(t -> t.getName().equalsIgnoreCase(org.getPricingTier()))
                    .findFirst()
                    .orElse(null);
            if (tier != null && tier.getPriceMonthlyUsd() != null) {
                estimatedMrr = estimatedMrr.add(tier.getPriceMonthlyUsd());
            }
        }
        
        return ResponseEntity.ok(Map.of(
            "totalOrganizations", totalOrgs,
            "totalUsers", totalUsers,
            "estimatedMrr", estimatedMrr
        ));
    }

    @Data
    @Builder
    public static class OrgStatsResponse {
        private UUID id;
        private String name;
        private String pricingTier;
        private Instant createdAt;
        private long memberCount;
        private long projectCount;
        private long taskCount;
        private long issueCount;
        private Map<String, Object> insights;
        private BigDecimal revenue;
        private String status;
    }

    @Data
    public static class OnboardOrgRequest {
        private String orgName;
        private String pricingTier;
        private String adminName;
        private String adminEmail;
        private String adminPassword;
    }
}
