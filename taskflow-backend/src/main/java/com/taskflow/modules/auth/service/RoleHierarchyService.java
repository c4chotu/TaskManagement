package com.taskflow.modules.auth.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.exception.UnauthorizedException;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.domain.UserRole;
import com.taskflow.modules.auth.domain.RolePermission;
import com.taskflow.modules.auth.domain.Organization;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.auth.repository.UserRoleRepository;
import com.taskflow.modules.auth.repository.RolePermissionRepository;
import com.taskflow.modules.auth.repository.OrganizationRepository;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.user.domain.Department;
import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.repository.DepartmentRepository;
import com.taskflow.modules.user.repository.TeamRepository;
import com.taskflow.modules.user.repository.UserProfileRepository;
import com.taskflow.modules.user.repository.TeamMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RoleHierarchyService {

    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final UserProfileRepository userProfileRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final OrganizationRepository organizationRepository;

    public RoleHierarchyService(UserRoleRepository userRoleRepository,
                                RolePermissionRepository rolePermissionRepository,
                                UserRepository userRepository,
                                ProjectMemberRepository projectMemberRepository,
                                DepartmentRepository departmentRepository,
                                TeamRepository teamRepository,
                                UserProfileRepository userProfileRepository,
                                TeamMemberRepository teamMemberRepository,
                                OrganizationRepository organizationRepository) {
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.userProfileRepository = userProfileRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public int getUserEffectiveRole(UUID userId, UUID organizationId) {
        List<UserRole> roles = userRoleRepository.findByUserIdAndOrganizationId(userId, organizationId);
        if (!roles.isEmpty()) {
            return roles.stream().mapToInt(UserRole::getRoleLevel).max().orElse(0);
        }

        // Fallback to auth.users role
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return 0;
        }
        return mapRoleNameToLevel(user.getRole());
    }

    @Transactional(readOnly = true)
    public int getUserRoleInDepartment(UUID userId, UUID departmentId) {
        return userRoleRepository.findByUserIdAndOrganizationId(userId, getOrgIdForUser(userId))
                .stream()
                .filter(r -> departmentId.equals(r.getDepartmentId()))
                .mapToInt(UserRole::getRoleLevel)
                .max()
                .orElse(0);
    }

    @Transactional(readOnly = true)
    public int getUserRoleInTeam(UUID userId, UUID teamId) {
        return userRoleRepository.findByUserIdAndOrganizationId(userId, getOrgIdForUser(userId))
                .stream()
                .filter(r -> teamId.equals(r.getTeamId()))
                .mapToInt(UserRole::getRoleLevel)
                .max()
                .orElse(0);
    }

    @Transactional(readOnly = true)
    public int getUserRoleInProject(UUID userId, UUID projectId) {
        Optional<ProjectMember> pm = projectMemberRepository.findByProjectIdAndUserId(projectId, userId);
        if (pm.isEmpty()) {
            return 0;
        }
        return mapProjectRoleToLevel(pm.get().getRole());
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(UUID userId, String permission, Map<String, UUID> context) {
        UUID orgId = context != null ? context.get("organizationId") : null;
        if (orgId == null) {
            orgId = getOrgIdForUser(userId);
        }
        if (orgId == null) {
            return false;
        }
        int effectiveLevel = getUserEffectiveRole(userId, orgId);
        
        // ORG_OWNER has all permissions
        if (effectiveLevel == 5) {
            return true;
        }

        // Get permissions configurations matching the permission
        List<RolePermission> perms = rolePermissionRepository.findAll().stream()
                .filter(p -> p.getPermission().equalsIgnoreCase(permission))
                .collect(Collectors.toList());

        if (perms.isEmpty()) {
            // Default permission check based on effective level
            return effectiveLevel >= 1;
        }

        for (RolePermission rp : perms) {
            int requiredLevel = mapRoleNameToLevel(rp.getRoleName());
            if (effectiveLevel >= requiredLevel) {
                String scope = rp.getScope();
                if ("ORG".equalsIgnoreCase(scope)) {
                    return true;
                } else if ("DEPT".equalsIgnoreCase(scope)) {
                    UUID deptId = context != null ? context.get("departmentId") : null;
                    if (deptId != null && getUserRoleInDepartment(userId, deptId) >= requiredLevel) {
                        return true;
                    }
                } else if ("TEAM".equalsIgnoreCase(scope)) {
                    UUID teamId = context != null ? context.get("teamId") : null;
                    if (teamId != null && getUserRoleInTeam(userId, teamId) >= requiredLevel) {
                        return true;
                    }
                } else if ("PROJECT".equalsIgnoreCase(scope)) {
                    UUID projectId = context != null ? context.get("projectId") : null;
                    if (projectId != null && getUserRoleInProject(userId, projectId) >= requiredLevel) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    @Transactional(readOnly = true)
    public List<User> getSubordinates(UUID userId) {
        User manager = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        UUID orgId = manager.getOrganizationId();
        int managerLevel = getUserEffectiveRole(userId, orgId);

        if (managerLevel == 0) {
            return Collections.emptyList();
        }

        List<User> orgUsers = userRepository.findAll().stream()
                .filter(u -> orgId.equals(u.getOrganizationId()) && !userId.equals(u.getId()))
                .collect(Collectors.toList());

        if (managerLevel >= 4) {
            // ORG_OWNER or ORG_ADMIN can manage all users with lower effective role
            return orgUsers.stream()
                    .filter(u -> getUserEffectiveRole(u.getId(), orgId) < managerLevel)
                    .collect(Collectors.toList());
        }

        List<User> subordinates = new ArrayList<>();
        List<UserRole> managerRoles = userRoleRepository.findByUserIdAndOrganizationId(userId, orgId);

        for (UserRole mr : managerRoles) {
            if (mr.getRoleLevel() == 3 && mr.getDepartmentId() != null) {
                UUID deptId = mr.getDepartmentId();
                for (User u : orgUsers) {
                    int userDeptRole = getUserRoleInDepartment(u.getId(), deptId);
                    if (userDeptRole < 3 && userDeptRole > 0) {
                        subordinates.add(u);
                    }
                }
            } else if (mr.getRoleLevel() == 2 && mr.getTeamId() != null) {
                UUID teamId = mr.getTeamId();
                for (User u : orgUsers) {
                    int userTeamRole = getUserRoleInTeam(u.getId(), teamId);
                    if (userTeamRole < 2 && userTeamRole > 0) {
                        subordinates.add(u);
                    }
                }
            }
        }

        return subordinates.stream().distinct().collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean canManageUser(UUID managerId, UUID subordinateId) {
        User manager = userRepository.findById(managerId).orElse(null);
        User subordinate = userRepository.findById(subordinateId).orElse(null);
        if (manager == null || subordinate == null) {
            return false;
        }

        UUID orgId = manager.getOrganizationId();
        if (!orgId.equals(subordinate.getOrganizationId())) {
            return false;
        }

        int managerLevel = getUserEffectiveRole(managerId, orgId);
        int subLevel = getUserEffectiveRole(subordinateId, orgId);

        // Same level cannot manage same level (except ORG_OWNER)
        if (managerLevel <= subLevel && managerLevel < 5) {
            return false;
        }

        if (managerLevel >= 4) {
            return true;
        }

        List<UserRole> managerRoles = userRoleRepository.findByUserIdAndOrganizationId(managerId, orgId);
        for (UserRole mr : managerRoles) {
            if (mr.getRoleLevel() == 3 && mr.getDepartmentId() != null) {
                int subDeptRole = getUserRoleInDepartment(subordinateId, mr.getDepartmentId());
                if (subDeptRole > 0 && subDeptRole < 3) {
                    return true;
                }
            }
            if (mr.getRoleLevel() == 2 && mr.getTeamId() != null) {
                int subTeamRole = getUserRoleInTeam(subordinateId, mr.getTeamId());
                if (subTeamRole > 0 && subTeamRole < 2) {
                    return true;
                }
            }
        }

        return false;
    }

    @Transactional
    public UserRole assignRole(UUID userId, int roleLevel, String roleName, UUID departmentId, UUID teamId, UUID grantedBy) {
        UUID orgId = getOrgIdForUser(userId);
        if (orgId == null) {
            throw new IllegalArgumentException("User does not belong to an organization");
        }

        int actorLevel = getUserEffectiveRole(grantedBy, orgId);
        // Elevation constraint: actor level must be at least 2 levels higher than target role level (except ORG_OWNER)
        if (actorLevel < 5 && actorLevel < (roleLevel + 2)) {
            throw new UnauthorizedException("Role elevation requires approval from two levels above. Actor level: " + actorLevel + ", Target level: " + roleLevel);
        }

        UserRole userRole = UserRole.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .organizationId(orgId)
                .roleLevel(roleLevel)
                .roleName(roleName)
                .departmentId(departmentId)
                .teamId(teamId)
                .grantedBy(grantedBy)
                .grantedAt(Instant.now())
                .build();

        return userRoleRepository.save(userRole);
    }

    @Transactional
    public void revokeRole(UUID roleId, UUID actorId) {
        UserRole role = userRoleRepository.findById(roleId)
                .orElseThrow(() -> new EntityNotFoundException("Role assignment not found"));

        if (!canManageUser(actorId, role.getUserId()) && getUserEffectiveRole(actorId, role.getOrganizationId()) < 4) {
            throw new UnauthorizedException("Insufficient privileges to revoke role");
        }

        userRoleRepository.delete(role);
    }

    @Transactional(readOnly = true)
    public List<UserRole> getRolesForUser(UUID userId, UUID organizationId) {
        return userRoleRepository.findByUserIdAndOrganizationId(userId, organizationId);
    }

    @Transactional
    public Department createDepartment(String name, String description, UUID headUserId, UUID parentDepartmentId, UUID organizationId) {
        Department dept = Department.builder()
                .id(UUID.randomUUID())
                .organizationId(organizationId)
                .name(name)
                .description(description)
                .headUserId(headUserId)
                .parentDepartmentId(parentDepartmentId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        return departmentRepository.save(dept);
    }

    @Transactional
    public Department updateDepartment(UUID id, String name, String description, UUID headUserId, UUID parentDepartmentId) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Department not found: " + id));

        dept.setName(name);
        dept.setDescription(description);
        dept.setHeadUserId(headUserId);
        dept.setParentDepartmentId(parentDepartmentId);
        dept.setUpdatedAt(Instant.now());

        return departmentRepository.save(dept);
    }

    @Transactional
    public void deleteDepartment(UUID id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Department not found: " + id));
        dept.setDeletedAt(Instant.now());
        departmentRepository.save(dept);
    }

    @Transactional
    public Team createTeamInDepartment(UUID departmentId, String name, String description, UUID leadUserId, UUID organizationId) {
        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new EntityNotFoundException("Department not found: " + departmentId));

        Team team = Team.builder()
                .id(UUID.randomUUID())
                .organizationId(organizationId)
                .departmentId(departmentId)
                .name(name)
                .description(description)
                .leadUserId(leadUserId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return teamRepository.save(team);
    }

    @Transactional(readOnly = true)
    public List<Department> getDepartmentsByOrganization(UUID orgId) {
        return departmentRepository.findByOrganizationId(orgId);
    }

    @Transactional
    public void bootstrapOrganization(
            UUID orgId,
            String orgName,
            String tier,
            List<Map<String, String>> departments,
            List<Map<String, String>> teams,
            List<Map<String, String>> members,
            UUID actorId) {

        // Save or update organization metadata
        Organization org = organizationRepository.findById(orgId).orElse(null);
        if (org == null) {
            org = Organization.builder()
                    .id(orgId)
                    .name(orgName)
                    .pricingTier(tier)
                    .build();
        } else {
            org.setName(orgName);
            if (tier != null) {
                org.setPricingTier(tier);
            }
        }
        organizationRepository.save(org);

        // 1. Create Departments and map name -> ID
        Map<String, UUID> deptMap = new HashMap<>();
        for (Map<String, String> d : departments) {
            String deptName = d.get("name");
            if (deptName == null || deptName.trim().isEmpty()) continue;
            Department dept = createDepartment(deptName, d.get("description"), null, null, orgId);
            deptMap.put(deptName, dept.getId());
        }

        // 2. Create Teams and map name -> ID
        Map<String, UUID> teamMap = new HashMap<>();
        Map<String, UUID> teamDeptMap = new HashMap<>();
        for (Map<String, String> t : teams) {
            String teamName = t.get("name");
            String deptName = t.get("departmentName");
            if (teamName == null || teamName.trim().isEmpty() || deptName == null) continue;
            UUID deptId = deptMap.get(deptName);
            if (deptId != null) {
                Team team = createTeamInDepartment(deptId, teamName, t.get("description"), null, orgId);
                teamMap.put(teamName, team.getId());
                teamDeptMap.put(teamName, deptId);
            }
        }

        // 3. Create Members
        for (Map<String, String> m : members) {
            String name = m.get("name");
            String email = m.get("email");
            String roleName = m.get("roleName");
            String teamName = m.get("teamName");

            if (name == null || email == null || roleName == null) continue;

            UUID memberId = UUID.randomUUID();

            // Create User
            User user = User.builder()
                    .id(memberId)
                    .email(email)
                    .name(name)
                    .passwordHash("$2a$10$8.UnVuG9HHgffUDAlk8GP.3n.K1P64e8.9Y.V2tA7vT9u2g5UuVLu") // password123
                    .role("ROLE_" + roleName)
                    .organizationId(orgId)
                    .build();
            userRepository.save(user);

            // Create UserProfile
            com.taskflow.modules.user.domain.UserProfile profile = com.taskflow.modules.user.domain.UserProfile.builder()
                    .id(memberId)
                    .email(email)
                    .name(name)
                    .role("ROLE_" + roleName)
                    .organizationId(orgId)
                    .build();
            userProfileRepository.save(profile);

            // Resolve Team and Department
            UUID teamId = (teamName != null && !teamName.isEmpty()) ? teamMap.get(teamName) : null;
            UUID deptId = (teamName != null && !teamName.isEmpty()) ? teamDeptMap.get(teamName) : null;

            // Create UserRole (Hierarchy role assignment)
            UserRole userRole = UserRole.builder()
                    .id(UUID.randomUUID())
                    .userId(memberId)
                    .organizationId(orgId)
                    .roleLevel(mapRoleNameToLevel(roleName))
                    .roleName(roleName)
                    .departmentId(deptId)
                    .teamId(teamId)
                    .grantedBy(actorId)
                    .grantedAt(Instant.now())
                    .build();
            userRoleRepository.save(userRole);

            // Add to TeamMember if team is set
            if (teamId != null) {
                com.taskflow.modules.user.domain.TeamMember tm = com.taskflow.modules.user.domain.TeamMember.builder()
                        .id(UUID.randomUUID())
                        .teamId(teamId)
                        .userId(memberId)
                        .role(roleName.equals("TEAM_LEAD") ? "LEAD" : "MEMBER")
                        .build();
                teamMemberRepository.save(tm);
            }
        }
    }

    private UUID getOrgIdForUser(UUID userId) {
        return userRepository.findById(userId)
                .map(User::getOrganizationId)
                .orElse(null);
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
            case "MEMBER":
                return 1;
            case "GUEST":
            case "ROLE_GUEST":
                return 0;
            default:
                return 1;
        }
    }

    private int mapProjectRoleToLevel(String projectRoleName) {
        if (projectRoleName == null) return 2;
        switch (projectRoleName.toUpperCase()) {
            case "PROJECT_OWNER":
                return 5;
            case "PROJECT_ADMIN":
                return 4;
            case "PROJECT_MANAGER":
                return 3;
            case "PROJECT_MEMBER":
                return 2;
            case "PROJECT_VIEWER":
                return 1;
            case "PROJECT_GUEST":
                return 0;
            default:
                return 2;
        }
    }
}
