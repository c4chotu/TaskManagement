package com.taskflow.modules.admin.seed;

import com.taskflow.common.security.AuthenticatedUser;
import com.taskflow.common.security.OrgContextHolder;
import com.taskflow.modules.auth.domain.Organization;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.repository.OrganizationRepository;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.project.domain.Phase;
import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.repository.PhaseRepository;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
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
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final PhaseRepository phaseRepository;
    private final CustomTaskStatusRepository customTaskStatusRepository;
    private final TaskService taskService;

    public AvendumSeeder(OrganizationRepository organizationRepository,
                        UserRepository userRepository,
                        ProjectRepository projectRepository,
                        ProjectMemberRepository projectMemberRepository,
                        PhaseRepository phaseRepository,
                        CustomTaskStatusRepository customTaskStatusRepository,
                        TaskService taskService) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.phaseRepository = phaseRepository;
        this.customTaskStatusRepository = customTaskStatusRepository;
        this.taskService = taskService;
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

        // 2. Create users: vp, admin, team lead, member
        User vp = User.builder().id(UUID.randomUUID()).email("vp@avendum.local").passwordHash("x").name("VP User").role("VP").organizationId(orgId).build();
        User admin = User.builder().id(UUID.randomUUID()).email("admin@avendum.local").passwordHash("x").name("Admin User").role("ADMIN").organizationId(orgId).build();
        User teamLead = User.builder().id(UUID.randomUUID()).email("lead@avendum.local").passwordHash("x").name("Team Lead").role("TEAM_LEAD").organizationId(orgId).build();
        User member = User.builder().id(UUID.randomUUID()).email("member@avendum.local").passwordHash("x").name("Member User").role("MEMBER").organizationId(orgId).build();
        userRepository.saveAll(List.of(vp, admin, teamLead, member));

        // Establish security context (OrgContext + Authentication) using VP as actor for creation
        OrgContextHolder.set(orgId);
        AuthenticatedUser auth = AuthenticatedUser.builder().id(vp.getId()).email(vp.getEmail()).name(vp.getName()).orgId(orgId).role(vp.getRole()).build();
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(auth, (String) null, List.of());
        SecurityContextHolder.getContext().setAuthentication(authToken);

        // 3. Create a project
        Project proj = Project.builder()
                .id(UUID.randomUUID())
                .name("AvendumTech - Core")
                .key("AVEND")
                .description("Seed project for AvendumTech")
                .status("ACTIVE")
                .type("SOFTWARE")
                .organizationId(orgId)
                .taskCounter(0)
                .build();
        projectRepository.save(proj);

        // Owner/project member assignments
        ProjectMember owner = ProjectMember.builder().id(UUID.randomUUID()).projectId(proj.getId()).userId(admin.getId()).role("PROJECT_OWNER").build();
        ProjectMember leadMember = ProjectMember.builder().id(UUID.randomUUID()).projectId(proj.getId()).userId(teamLead.getId()).role("PROJECT_MANAGER").build();
        ProjectMember mem = ProjectMember.builder().id(UUID.randomUUID()).projectId(proj.getId()).userId(member.getId()).role("PROJECT_MEMBER").build();
        projectMemberRepository.saveAll(List.of(owner, leadMember, mem));

        // 4. Create task statuses for the project
        UUID todoStatusId = createProjectStatuses(orgId, proj.getId());

        // 5. Create phases
        Phase p1 = Phase.builder().id(UUID.randomUUID()).projectId(proj.getId()).name("Phase 1 - Discovery").startDate(Instant.now()).endDate(Instant.now().plusSeconds(60*60*24*30)).build();
        Phase p2 = Phase.builder().id(UUID.randomUUID()).projectId(proj.getId()).name("Phase 2 - Implementation").startDate(Instant.now().plusSeconds(60*60*24*31)).endDate(Instant.now().plusSeconds(60*60*24*90)).build();
        phaseRepository.saveAll(List.of(p1, p2));

        // 6. Create tasks (phase-wise) using TaskService to ensure statuses etc are created
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

    /**
     * Create default task statuses for a project and return the "To Do" status UUID.
     */
    private UUID createProjectStatuses(UUID orgId, UUID projectId) {
        String[] names      = {"Backlog", "To Do", "In Progress", "In Review", "Blocked", "Done"};
        String[] categories = {"PLANNING","PLANNING","ACTIVE","ACTIVE","BLOCKED","COMPLETED"};
        String[] colors     = {"#64748b","#3b82f6","#10b981","#a855f7","#ef4444","#22c55e"};
        int[]    limits     = {5, 5, 3, 3, 1, 0};
        boolean[] reqComment = {false, false, false, false, true, false};

        UUID todoStatusId = null;
        for (int i = 0; i < names.length; i++) {
            UUID statusId = UUID.randomUUID();
            CustomTaskStatus status = CustomTaskStatus.builder()
                    .id(statusId)
                    .organizationId(orgId)
                    .projectId(projectId)
                    .name(names[i])
                    .category(categories[i])
                    .color(colors[i])
                    .sortOrder((i + 1) * 10)
                    .isDefault(i == 1) // "To Do" is default
                    .requiresComment(reqComment[i])
                    .requiresApproval(false)
                    // .wipLimit(limits[i])
                    .build();
            customTaskStatusRepository.save(status);

            // Save the "To Do" status ID for task creation
            if (i == 1) {
                todoStatusId = statusId;
            }
        }
        return todoStatusId;
    }
}
