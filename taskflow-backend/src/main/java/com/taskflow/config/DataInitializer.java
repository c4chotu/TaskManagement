package com.taskflow.config;

import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.domain.UserRole;
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
import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.task.domain.CustomTaskStatus;
import com.taskflow.modules.task.repository.CustomTaskStatusRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    // Fixed IDs for stable references
    private static final UUID SYSTEM_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");
    private static final UUID AVENDUM_ORG_ID = UUID.fromString("ab0c0d0e-1234-5678-abcd-efabcdef0000");

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserProfileRepository userProfileRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           UserRoleRepository userRoleRepository,
                           UserProfileRepository userProfileRepository,
                           DepartmentRepository departmentRepository,
                           TeamRepository teamRepository,
                           TeamMemberRepository teamMemberRepository,
                           ProjectRepository projectRepository,
                           ProjectMemberRepository projectMemberRepository,
                           CustomTaskStatusRepository customTaskStatusRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.userProfileRepository = userProfileRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // ----------------------------------------------------------------
        // 1. Super Admin (system-level — taskflow.io domain)
        // ----------------------------------------------------------------
        if (userRepository.findByEmail("superadmin@taskflow.io").isEmpty()) {
            String hash = passwordEncoder.encode("admin123");
            UUID saId = UUID.randomUUID();

            userRepository.save(User.builder()
                    .id(saId).email("superadmin@taskflow.io").name("Super Admin")
                    .passwordHash(hash).role("ROLE_SUPER_ADMIN")
                    .organizationId(SYSTEM_ORG_ID).build());

            userProfileRepository.save(UserProfile.builder()
                    .id(saId).email("superadmin@taskflow.io").name("Super Admin")
                    .role("ROLE_SUPER_ADMIN").organizationId(SYSTEM_ORG_ID)
                    .bio("Platform Super Administrator").build());

            userRoleRepository.save(UserRole.builder()
                    .id(UUID.randomUUID()).userId(saId)
                    .organizationId(SYSTEM_ORG_ID).roleLevel(10).roleName("SUPER_ADMIN")
                    .build());

            log.info("✔ Super Admin created  →  superadmin@taskflow.io / admin123");
        }

        // ----------------------------------------------------------------
        // 2. Skip if Avendum is already fully seeded
        // ----------------------------------------------------------------
        if (userRepository.findByEmail("vp@avendum.tech").isPresent()) {
            log.info("Avendum Tech already seeded — skipping.");
            return;
        }

        log.info("Seeding Avendum Tech organization...");

        // Pre-hash once (BCrypt is slow)
        String memberPass = passwordEncoder.encode("Admin@1234");

        // ----------------------------------------------------------------
        // 3. VP / Org Owner
        // ----------------------------------------------------------------
        UUID vpId = UUID.randomUUID();
        createUser(vpId, "vp@avendum.tech", "VP Admin", memberPass,
                "ROLE_ORG_OWNER", "ORG_OWNER", 5, AVENDUM_ORG_ID,
                null, null, vpId, "VP of Technology Operations");

        log.info("✔ VP Admin  →  vp@avendum.tech / Admin@1234");

        // ----------------------------------------------------------------
        // 4. Departments & Teams
        // ----------------------------------------------------------------
        record TeamCfg(String deptName, String teamName, String slug, String projName) {}
        List<TeamCfg> configs = List.of(
            new TeamCfg("Telco Department",       "Telco Team",       "telco",       "Avendum Cloud Migration"),
            new TeamCfg("Dev Department",          "Dev Team",         "dev",         "Mobile App Redesign v2.0"),
            new TeamCfg("Integration Department",  "Integration Team", "integration", "Enterprise ERP Integration"),
            new TeamCfg("QA Department",           "QA Team",          "qa",          "Q3 Marketing Campaign")
        );

        Instant projStart = Instant.now();
        Instant projEnd   = projStart.plus(60, ChronoUnit.DAYS);

        List<TeamData> seededTeams = new ArrayList<>();

        for (TeamCfg cfg : configs) {
            // --- Department ---
            UUID deptId = UUID.randomUUID();
            departmentRepository.save(Department.builder()
                    .id(deptId).organizationId(AVENDUM_ORG_ID)
                    .name(cfg.deptName()).description("Department for " + cfg.teamName())
                    .headUserId(vpId).build());

            // --- Team ---
            UUID teamId = UUID.randomUUID();
            teamRepository.save(Team.builder()
                    .id(teamId).name(cfg.teamName()).organizationId(AVENDUM_ORG_ID)
                    .departmentId(deptId)
                    .description("High-performance squad — " + cfg.teamName())
                    .build());

            // --- Manager (DEPT_HEAD, L3) ---
            UUID mgrId = UUID.randomUUID();
            String mgrEmail = cfg.slug() + ".admin@avendum.tech";
            createUser(mgrId, mgrEmail, cfg.teamName() + " Admin", memberPass,
                    "ROLE_DEPT_HEAD", "DEPT_HEAD", 3, AVENDUM_ORG_ID,
                    deptId, teamId, vpId, "Admin for " + cfg.teamName());
            teamMemberRepository.save(TeamMember.builder().id(UUID.randomUUID())
                    .teamId(teamId).userId(mgrId).role("MANAGER").build());
            log.info("  ✔ Admin  → {}", mgrEmail);

            // --- Team Lead (TEAM_LEAD, L2) ---
            UUID leadId = UUID.randomUUID();
            String leadEmail = cfg.slug() + ".lead@avendum.tech";
            createUser(leadId, leadEmail, cfg.teamName() + " Lead", memberPass,
                    "ROLE_TEAM_LEAD", "TEAM_LEAD", 2, AVENDUM_ORG_ID,
                    deptId, teamId, mgrId, "Tech Lead — " + cfg.teamName());
            teamMemberRepository.save(TeamMember.builder().id(UUID.randomUUID())
                    .teamId(teamId).userId(leadId).role("LEAD").build());

            // Update team lead ref
            Team team = teamRepository.findById(teamId).orElseThrow();
            team.setLeadUserId(leadId);
            teamRepository.save(team);
            log.info("  ✔ Lead   → {}", leadEmail);

            // --- 10 Members (TEAM_MEMBER, L1) ---
            List<UUID> memberIds = new ArrayList<>();
            for (int i = 1; i <= 10; i++) {
                UUID memId = UUID.randomUUID();
                String memEmail = cfg.slug() + ".member" + i + "@avendum.tech";
                createUser(memId, memEmail, cfg.teamName() + " Member " + i, memberPass,
                        "ROLE_TEAM_MEMBER", "TEAM_MEMBER", 1, AVENDUM_ORG_ID,
                        deptId, teamId, leadId, "Software Engineer — " + cfg.teamName());
                teamMemberRepository.save(TeamMember.builder().id(UUID.randomUUID())
                        .teamId(teamId).userId(memId).role("MEMBER").build());
                memberIds.add(memId);
            }
            log.info("  ✔ 10 members for {}", cfg.teamName());

            // --- Project ---
            String derivedKey = cfg.projName().replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            if (derivedKey.isEmpty()) derivedKey = "PROJ";
            if (derivedKey.length() > 8) derivedKey = derivedKey.substring(0, 8);

            UUID projectId = UUID.randomUUID();
            projectRepository.save(Project.builder()
                    .id(projectId).name(cfg.projName())
                    .key(derivedKey)
                    .description("Core project for " + cfg.teamName())
                    .status("ACTIVE").type("KANBAN")
                    .startDate(projStart).endDate(projEnd)
                    .taskCounter(0)
                    .organizationId(AVENDUM_ORG_ID).build());

            // VP as owner
            projectMemberRepository.save(ProjectMember.builder().id(UUID.randomUUID())
                    .projectId(projectId).userId(vpId).role("PROJECT_OWNER").build());
            // Manager as manager
            projectMemberRepository.save(ProjectMember.builder().id(UUID.randomUUID())
                    .projectId(projectId).userId(mgrId).role("PROJECT_MANAGER").build());
            // Lead + members
            projectMemberRepository.save(ProjectMember.builder().id(UUID.randomUUID())
                    .projectId(projectId).userId(leadId).role("PROJECT_MEMBER").build());
            for (UUID memId : memberIds) {
                projectMemberRepository.save(ProjectMember.builder().id(UUID.randomUUID())
                        .projectId(projectId).userId(memId).role("PROJECT_MEMBER").build());
            }

            seedCustomStatuses(AVENDUM_ORG_ID, projectId, deptId);
            log.info("  ✔ Project '{}'  (key={})", cfg.projName(), derivedKey);

            seededTeams.add(new TeamData(teamId, mgrId, leadId, memberIds, cfg.teamName()));
        }

        log.info("✅ Avendum Tech seeding complete — {} teams, {} projects.",
                seededTeams.size(), seededTeams.size());
    }

    // ----------------------------------------------------------------
    // Helper: create auth.users + users.user_profiles + auth.user_roles
    // ----------------------------------------------------------------
    private void createUser(UUID id, String email, String name, String passwordHash,
                            String springRole, String roleName, int roleLevel,
                            UUID orgId, UUID deptId, UUID teamId, UUID grantedBy,
                            String bio) {
        userRepository.save(User.builder()
                .id(id).email(email).name(name)
                .passwordHash(passwordHash).role(springRole)
                .organizationId(orgId).build());

        userProfileRepository.save(UserProfile.builder()
                .id(id).email(email).name(name)
                .role(springRole).organizationId(orgId).bio(bio).build());

        userRoleRepository.save(UserRole.builder()
                .id(UUID.randomUUID()).userId(id)
                .organizationId(orgId).roleLevel(roleLevel).roleName(roleName)
                .departmentId(deptId).teamId(teamId).grantedBy(grantedBy)
                .build());
    }

    // ----------------------------------------------------------------
    // Helper: seed Kanban columns for a project
    // ----------------------------------------------------------------
    private void seedCustomStatuses(UUID orgId, UUID projectId, UUID deptId) {
        String[] names      = {"Backlog", "To Do", "In Progress", "In Review", "Blocked", "Done"};
        String[] categories = {"PLANNING","PLANNING","ACTIVE","ACTIVE","BLOCKED","COMPLETED"};
        String[] colors     = {"#64748b","#3b82f6","#10b981","#a855f7","#ef4444","#22c55e"};
        int[]    limits     = {5, 5, 3, 3, 1, 0};
        boolean[] reqComment = {false, false, false, false, true, false};

        for (int i = 0; i < names.length; i++) {
            customTaskStatusRepository.save(CustomTaskStatus.builder()
                    .id(UUID.randomUUID())
                    .organizationId(orgId).projectId(projectId).departmentId(deptId)
                    .name(names[i]).category(categories[i]).color(colors[i])
                    .sortOrder((i + 1) * 10).isDefault(i == 0)
                    .requiresComment(reqComment[i]).requiresApproval(false)
                    .build());
        }
    }

    // ----------------------------------------------------------------
    private static class TeamData {
        final UUID teamId, managerId, leadId;
        final List<UUID> memberIds;
        final String name;
        TeamData(UUID t, UUID m, UUID l, List<UUID> ms, String n) {
            teamId = t; managerId = m; leadId = l; memberIds = ms; name = n;
        }
    }
}
