package com.taskflow.modules.admin.seed;

import com.taskflow.common.security.AuthenticatedUser;
import com.taskflow.common.security.OrgContextHolder;
import com.taskflow.modules.auth.domain.Organization;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.domain.UserRole;
import com.taskflow.modules.auth.repository.OrganizationRepository;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.auth.repository.UserRoleRepository;
import com.taskflow.modules.user.domain.Department;
import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.domain.TeamMember;
import com.taskflow.modules.user.domain.UserProfile;
import com.taskflow.modules.user.repository.DepartmentRepository;
import com.taskflow.modules.user.repository.TeamMemberRepository;
import com.taskflow.modules.user.repository.TeamRepository;
import com.taskflow.modules.user.repository.UserProfileRepository;
import com.taskflow.modules.project.domain.Phase;
import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.domain.ProjectTeam;
import com.taskflow.modules.project.repository.PhaseRepository;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.project.repository.ProjectTeamRepository;
import com.taskflow.modules.task.domain.CustomTaskStatus;
import com.taskflow.modules.task.dto.TaskRequest;
import com.taskflow.modules.task.repository.CustomTaskStatusRepository;
import com.taskflow.modules.task.service.TaskService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
public class AvendumSeeder {

    private static final Logger log = LoggerFactory.getLogger(AvendumSeeder.class);

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserProfileRepository userProfileRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectTeamRepository projectTeamRepository;
    private final PhaseRepository phaseRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final TaskService taskService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AvendumSeeder(OrganizationRepository organizationRepository,
                        UserRepository userRepository,
                        UserRoleRepository userRoleRepository,
                        UserProfileRepository userProfileRepository,
                        DepartmentRepository departmentRepository,
                        TeamRepository teamRepository,
                        TeamMemberRepository teamMemberRepository,
                        ProjectRepository projectRepository,
                        ProjectMemberRepository projectMemberRepository,
                        ProjectTeamRepository projectTeamRepository,
                        PhaseRepository phaseRepository,
                        CustomTaskStatusRepository customTaskStatusRepository,
                        TaskService taskService,
                        org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.userProfileRepository = userProfileRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectTeamRepository = projectTeamRepository;
        this.phaseRepository = phaseRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.taskService = taskService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void seedAvendum() {
        // 1. Create organization
        UUID orgId = UUID.randomUUID();
        Organization org = Organization.builder()
                .id(orgId)
                .name("AvendumTech")
                .pricingTier("enterprise")
                .build();
        organizationRepository.save(org);

        // 2. Generate UUIDs for users, department, and team
        UUID vpId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID leadId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();

        UUID deptId = UUID.randomUUID();
        UUID teamId = UUID.randomUUID();

        // 3. Create Users and UserProfiles first (they do not depend on department/team)
        String passHash = passwordEncoder.encode("x");
        
        User vp = createUser(vpId, "vp@avendum.local", "VP User", passHash, "ROLE_ORG_OWNER", orgId, "VP of Technology Operations");
        User admin = createUser(adminId, "admin@avendum.local", "Admin User", passHash, "ROLE_ORG_ADMIN", orgId, "Administrator");
        User teamLead = createUser(leadId, "lead@avendum.local", "Team Lead", passHash, "ROLE_TEAM_LEAD", orgId, "Technical Team Lead");
        User member = createUser(memberId, "member@avendum.local", "Member User", passHash, "ROLE_TEAM_MEMBER", orgId, "Software Engineer");

        // 4. Create Department (depends on vpId existing in users)
        Department dept = Department.builder()
                .id(deptId)
                .organizationId(orgId)
                .name("Engineering")
                .description("Core engineering department")
                .headUserId(vpId)
                .build();
        departmentRepository.save(dept);

        // 5. Create Team (depends on deptId and leadId existing in departments and users)
        Team team = Team.builder()
                .id(teamId)
                .organizationId(orgId)
                .departmentId(deptId)
                .name("Avendum Tech Team")
                .description("Core development team")
                .leadUserId(leadId)
                .build();
        teamRepository.save(team);

        // 6. Create UserRoles (depends on users, departments, and teams all existing)
        createUserRole(vpId, orgId, 5, "ORG_OWNER", null, null, vpId);
        createUserRole(adminId, orgId, 4, "ORG_ADMIN", deptId, null, vpId);
        createUserRole(leadId, orgId, 2, "TEAM_LEAD", deptId, teamId, adminId);
        createUserRole(memberId, orgId, 1, "TEAM_MEMBER", deptId, teamId, leadId);

        // 7. Create TeamMember associations (depends on teams and users existing)
        TeamMember tmAdmin = TeamMember.builder()
                .id(UUID.randomUUID())
                .teamId(teamId)
                .userId(adminId)
                .role("MANAGER")
                .build();
        TeamMember tmLead = TeamMember.builder()
                .id(UUID.randomUUID())
                .teamId(teamId)
                .userId(leadId)
                .role("LEAD")
                .build();
        TeamMember tmMember = TeamMember.builder()
                .id(UUID.randomUUID())
                .teamId(teamId)
                .userId(memberId)
                .role("MEMBER")
                .build();
        teamMemberRepository.saveAll(List.of(tmAdmin, tmLead, tmMember));

        // Establish security context (OrgContext + Authentication) using VP as actor for creation
        OrgContextHolder.set(orgId);
        AuthenticatedUser auth = AuthenticatedUser.builder()
                .id(vp.getId())
                .email(vp.getEmail())
                .name(vp.getName())
                .orgId(orgId)
                .role(vp.getRole())
                .build();
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(auth, (String) null, List.of());
        SecurityContextHolder.getContext().setAuthentication(authToken);

        // 8. Create a project
        Project proj = Project.builder()
                .id(UUID.randomUUID())
                .name("AvendumTech - Core")
                .key("AVEND")
                .description("Seed project for AvendumTech")
                .specification("This is a seeded specification for the AvendumTech core project. It contains example architecture notes and acceptance criteria.")
                .features(List.of("Authentication", "Task Management", "Reporting"))
                .techStack(List.of("Java", "Spring Boot", "React", "PostgreSQL"))
                .status("ACTIVE")
                .type("SOFTWARE")
                .organizationId(orgId)
                .taskCounter(0)
                .build();
        projectRepository.save(proj);

        // 9. Associate Team with Project
        ProjectTeam pt = ProjectTeam.builder()
                .id(UUID.randomUUID())
                .projectId(proj.getId())
                .teamId(teamId)
                .build();
        projectTeamRepository.save(pt);

        // Owner/project member assignments
        ProjectMember owner = ProjectMember.builder().id(UUID.randomUUID()).projectId(proj.getId()).userId(adminId).role("PROJECT_OWNER").build();
        ProjectMember leadMember = ProjectMember.builder().id(UUID.randomUUID()).projectId(proj.getId()).userId(leadId).role("PROJECT_MANAGER").build();
        ProjectMember mem = ProjectMember.builder().id(UUID.randomUUID()).projectId(proj.getId()).userId(memberId).role("PROJECT_MEMBER").build();
        ProjectMember vpMember = ProjectMember.builder().id(UUID.randomUUID()).projectId(proj.getId()).userId(vpId).role("PROJECT_OWNER").build();
        projectMemberRepository.saveAll(List.of(owner, leadMember, mem, vpMember));

        // 10. Create task statuses for the organization (and retrieve "Open" as default todo status ID)
        UUID todoStatusId = seedOrganizationStatuses(orgId);

        // 11. Create phases
        Phase p1 = Phase.builder().id(UUID.randomUUID()).projectId(proj.getId()).name("Phase 1 - Discovery").startDate(Instant.now()).endDate(Instant.now().plusSeconds(60*60*24*30)).build();
        Phase p2 = Phase.builder().id(UUID.randomUUID()).projectId(proj.getId()).name("Phase 2 - Implementation").startDate(Instant.now().plusSeconds(60*60*24*31)).endDate(Instant.now().plusSeconds(60*60*24*90)).build();
        phaseRepository.saveAll(List.of(p1, p2));

        // 12. Create tasks (phase-wise) using TaskService to ensure statuses etc are created
        TaskRequest t1 = new TaskRequest();
        t1.setProjectId(proj.getId());
        t1.setTitle("Design architecture");
        t1.setDescription("Create initial architecture docs");
        t1.setPhaseId(p1.getId());
        t1.setStatusId(todoStatusId);
        taskService.createTask(t1);

        TaskRequest t2 = new TaskRequest();
        t2.setProjectId(proj.getId());
        t2.setTitle("Implement core modules");
        t2.setDescription("Develop main services");
        t2.setPhaseId(p2.getId());
        t2.setStatusId(todoStatusId);
        taskService.createTask(t2);

        // Clear security context
        SecurityContextHolder.clearContext();
        OrgContextHolder.clear();

        log.info("Avendum seed completed: org={}, project={}", orgId, proj.getId());
    }

    private User createUser(UUID id, String email, String name, String passwordHash,
                            String springRole, UUID orgId, String bio) {
        User user = User.builder()
                .id(id)
                .email(email)
                .name(name)
                .passwordHash(passwordHash)
                .role(springRole)
                .organizationId(orgId)
                .build();
        userRepository.save(user);

        UserProfile profile = UserProfile.builder()
                .id(id)
                .email(email)
                .name(name)
                .role(springRole)
                .organizationId(orgId)
                .bio(bio)
                .build();
        userProfileRepository.save(profile);

        return user;
    }

    private void createUserRole(UUID userId, UUID orgId, int roleLevel, String roleName, UUID deptId, UUID teamId, UUID grantedBy) {
        UserRole role = UserRole.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .organizationId(orgId)
                .roleLevel(roleLevel)
                .roleName(roleName)
                .departmentId(deptId)
                .teamId(teamId)
                .grantedBy(grantedBy)
                .build();
        userRoleRepository.save(role);
    }

    private UUID seedOrganizationStatuses(UUID orgId) {
        String[] names      = {"Open", "In Progress", "Dev Done", "In Review", "To Be Deployed", "Ready For QA", "Reopened", "Rejected", "Closed"};
        String[] categories = {"PLANNING","ACTIVE","ACTIVE","ACTIVE","ACTIVE","ACTIVE","PLANNING","BLOCKED","COMPLETED"};
        String[] colors     = {"#3b82f6","#10b981","#6366f1","#a855f7","#f59e0b","#14b8a6","#ec4899","#ef4444","#22c55e"};
        UUID openStatusId = null;

        for (int i = 0; i < names.length; i++) {
            UUID statusId = UUID.randomUUID();
            if (i == 0) {
                openStatusId = statusId;
            }
            CustomTaskStatus status = CustomTaskStatus.builder()
                    .id(statusId)
                    .organizationId(orgId)
                    .projectId(null)
                    .departmentId(null)
                    .name(names[i])
                    .category(categories[i])
                    .color(colors[i])
                    .sortOrder((i + 1) * 10)
                    .isDefault(i == 0)
                    .requiresComment(names[i].equalsIgnoreCase("Rejected"))
                    .requiresApproval(false)
                    .build();
            customTaskStatusRepository.save(status);
        }
        return openStatusId;
    }
}
