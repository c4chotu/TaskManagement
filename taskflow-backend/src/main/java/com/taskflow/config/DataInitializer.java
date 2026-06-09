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
import com.taskflow.modules.project.domain.ProjectTeam;
import com.taskflow.modules.project.repository.ProjectTeamRepository;
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
    private final ProjectTeamRepository projectTeamRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public DataInitializer(UserRepository userRepository,
                           UserRoleRepository userRoleRepository,
                           UserProfileRepository userProfileRepository,
                           DepartmentRepository departmentRepository,
                           TeamRepository teamRepository,
                           TeamMemberRepository teamMemberRepository,
                           ProjectRepository projectRepository,
                           ProjectMemberRepository projectMemberRepository,
                           ProjectTeamRepository projectTeamRepository,
                           CustomTaskStatusRepository customTaskStatusRepository,
                           PasswordEncoder passwordEncoder,
                           org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.userProfileRepository = userProfileRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectTeamRepository = projectTeamRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
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
        // 2. Skip if Avendum is already fully seeded (check for projects)
        // ----------------------------------------------------------------
        // Force clean re-seed for development to verify team mappings and schema updates.
        boolean alreadyHasNewStatuses = false;

        if (!alreadyHasNewStatuses) {
            log.info("Clearing old Avendum Tech seeding to apply new custom statuses...");
            try {
                jdbcTemplate.execute("DELETE FROM files.file_attachments WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000'");
                jdbcTemplate.execute("DELETE FROM tasks.task_dependencies WHERE task_id IN (SELECT id FROM tasks.tasks WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM tasks.task_assignments WHERE task_id IN (SELECT id FROM tasks.tasks WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM tasks.comments WHERE entity_id IN (SELECT id FROM tasks.tasks WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM tasks.issue_details WHERE task_id IN (SELECT id FROM tasks.tasks WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM tasks.custom_field_values WHERE task_id IN (SELECT id FROM tasks.tasks WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM tasks.task_activities WHERE task_id IN (SELECT id FROM tasks.tasks WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM tasks.status_history WHERE task_id IN (SELECT id FROM tasks.tasks WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM tasks.recurring_tasks WHERE template_task_id IN (SELECT id FROM tasks.tasks WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM tasks.tasks WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000'");
                jdbcTemplate.execute("DELETE FROM tasks.status_transitions WHERE from_status_id IN (SELECT id FROM tasks.custom_task_statuses WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000') OR to_status_id IN (SELECT id FROM tasks.custom_task_statuses WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM tasks.custom_task_statuses WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000'");
                
                jdbcTemplate.execute("DELETE FROM projects.project_teams WHERE project_id IN (SELECT id FROM projects.projects WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM projects.project_members WHERE project_id IN (SELECT id FROM projects.projects WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM projects.projects WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000'");
                jdbcTemplate.execute("DELETE FROM users.team_members WHERE team_id IN (SELECT id FROM users.teams WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000')");
                jdbcTemplate.execute("DELETE FROM users.teams WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000'");
                jdbcTemplate.execute("DELETE FROM users.departments WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000'");
                jdbcTemplate.execute("DELETE FROM auth.user_roles WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000'");
                jdbcTemplate.execute("DELETE FROM users.user_profiles WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000'");
                jdbcTemplate.execute("DELETE FROM auth.users WHERE organization_id = 'ab0c0d0e-1234-5678-abcd-efabcdef0000'");
            } catch (Exception e) {
                log.error("Failed to clear old seeded database elements: {}", e.getMessage());
            }
        }

        if (!projectRepository.findByOrganizationId(AVENDUM_ORG_ID).isEmpty()) {
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

        // Seed custom statuses once at organization level
        UUID globalOpenStatusId = seedCustomStatuses(AVENDUM_ORG_ID, null, null);
        customTaskStatusRepository.flush();
        log.info("✔ Seeded 9 custom statuses at the organization level");

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

            projectRepository.flush();
            teamRepository.flush();
            userRepository.flush();

            // Associate Team with Project
            projectTeamRepository.save(ProjectTeam.builder()
                    .id(UUID.randomUUID())
                    .projectId(projectId)
                    .teamId(teamId)
                    .build());
            projectTeamRepository.flush();

            UUID openStatusId = globalOpenStatusId;
            
            // Seed Team Automation Rule: Auto-assign task to Lead and set Status to Open when Team is selected
            UUID ruleId = UUID.randomUUID();
            jdbcTemplate.update("INSERT INTO automations.automation_rules (id, project_id, organization_id, name, description, trigger_type, is_active, created_by, rule_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    ruleId, projectId, AVENDUM_ORG_ID, "Auto-assign " + cfg.teamName() + " tasks", "Auto-assigns to team lead and sets status to Open when " + cfg.teamName() + " is selected", "TASK_CREATED", true, vpId, "TEAM_SPECIFIC");

            // Seed condition: teamId EQUALS teamId
            jdbcTemplate.update("INSERT INTO automations.automation_conditions (id, rule_id, field_name, operator, field_value, position) VALUES (?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), ruleId, "teamId", "EQUALS", teamId.toString(), 0);

            // Seed Action 1: ASSIGN_USER
            String assignConfig = String.format("{\"userId\":\"%s\",\"role\":\"ASSIGNEE\"}", leadId.toString());
            jdbcTemplate.update("INSERT INTO automations.automation_actions (id, rule_id, action_type, action_config, position) VALUES (?, ?, ?, ?::jsonb, ?)",
                    UUID.randomUUID(), ruleId, "ASSIGN_USER", assignConfig, 0);

            // Seed Action 2: CHANGE_STATUS
            String statusConfig = String.format("{\"statusId\":\"%s\"}", openStatusId.toString());
            jdbcTemplate.update("INSERT INTO automations.automation_actions (id, rule_id, action_type, action_config, position) VALUES (?, ?, ?, ?::jsonb, ?)",
                    UUID.randomUUID(), ruleId, "CHANGE_STATUS", statusConfig, 1);

            log.info("  ✔ Project '{}'  (key={}) and custom auto-assign rule", cfg.projName(), derivedKey);

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
    private UUID seedCustomStatuses(UUID orgId, UUID projectId, UUID deptId) {
        String[] names      = {"Open", "In Progress", "Dev Done", "In Review", "To Be Deployed", "Ready For QA", "Reopened", "Rejected", "Closed"};
        String[] categories = {"PLANNING","ACTIVE","ACTIVE","ACTIVE","ACTIVE","ACTIVE","PLANNING","BLOCKED","COMPLETED"};
        String[] colors     = {"#3b82f6","#10b981","#6366f1","#a855f7","#f59e0b","#14b8a6","#ec4899","#ef4444","#22c55e"};
        UUID openStatusId = null;

        for (int i = 0; i < names.length; i++) {
            UUID statusId = UUID.randomUUID();
            if (i == 0) {
                openStatusId = statusId;
            }
            customTaskStatusRepository.save(CustomTaskStatus.builder()
                    .id(statusId)
                    .organizationId(orgId).projectId(projectId).departmentId(deptId)
                    .name(names[i]).category(categories[i]).color(colors[i])
                    .sortOrder((i + 1) * 10).isDefault(i == 0)
                    .requiresComment(names[i].equalsIgnoreCase("Rejected"))
                    .requiresApproval(false)
                    .build());
        }
        return openStatusId;
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
