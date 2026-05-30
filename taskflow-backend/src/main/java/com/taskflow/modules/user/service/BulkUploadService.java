package com.taskflow.modules.user.service;

import com.taskflow.common.exception.TenantIsolationException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.auth.domain.User;
import com.taskflow.modules.auth.domain.UserRole;
import com.taskflow.modules.auth.repository.UserRepository;
import com.taskflow.modules.auth.repository.UserRoleRepository;
import com.taskflow.modules.project.domain.ProjectMember;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.domain.TaskAssignment;
import com.taskflow.modules.task.dto.TaskRequest;
import com.taskflow.modules.task.dto.TaskResponse;
import com.taskflow.modules.task.repository.TaskAssignmentRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.service.TaskService;
import com.taskflow.modules.user.domain.Department;
import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.domain.TeamMember;
import com.taskflow.modules.user.domain.UserProfile;
import com.taskflow.modules.user.repository.DepartmentRepository;
import com.taskflow.modules.user.repository.TeamMemberRepository;
import com.taskflow.modules.user.repository.TeamRepository;
import com.taskflow.modules.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BulkUploadService {

    private static final Logger log = LoggerFactory.getLogger(BulkUploadService.class);

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserProfileRepository userProfileRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final DepartmentRepository departmentRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final TaskService taskService;
    private final PasswordEncoder passwordEncoder;

    // -------------------------------------------------------------------------
    // Result DTO
    // -------------------------------------------------------------------------
    public record BulkUploadResult(int succeeded, int failed, List<String> errors) {}

    // -------------------------------------------------------------------------
    // Teams: CSV columns → name,description
    // -------------------------------------------------------------------------
    @Transactional
    public BulkUploadResult uploadTeams(MultipartFile file) {
        UUID orgId = requireOrgId();
        List<String[]> rows = parseCsv(file);
        int ok = 0; int fail = 0; List<String> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            String[] row = rows.get(i);
            try {
                if (row.length < 1) throw new IllegalArgumentException("Missing 'name' column");
                String name = trim(row, 0);
                String desc = row.length > 1 ? trim(row, 1) : "";

                if (name.isEmpty()) throw new IllegalArgumentException("Team name is blank");

                Team team = Team.builder()
                        .id(UUID.randomUUID())
                        .name(name)
                        .description(desc)
                        .organizationId(orgId)
                        .build();
                teamRepository.save(team);
                ok++;
            } catch (Exception e) {
                fail++;
                errors.add("Row " + (i + 2) + ": " + e.getMessage());
            }
        }
        return new BulkUploadResult(ok, fail, errors);
    }

    // -------------------------------------------------------------------------
    // People: CSV columns → name,email,password,roleName,teamName,departmentName
    // -------------------------------------------------------------------------
    @Transactional
    public BulkUploadResult uploadPeople(MultipartFile file) {
        UUID orgId = requireOrgId();
        List<String[]> rows = parseCsv(file);
        int ok = 0; int fail = 0; List<String> errors = new ArrayList<>();

        // Cache teams + depts for name → id lookup
        Map<String, UUID> teamMap = new HashMap<>();
        teamRepository.findByOrganizationId(orgId).forEach(t -> teamMap.put(t.getName().toLowerCase(), t.getId()));
        Map<String, UUID> deptMap = new HashMap<>();
        departmentRepository.findByOrganizationId(orgId).forEach(d -> deptMap.put(d.getName().toLowerCase(), d.getId()));

        for (int i = 0; i < rows.size(); i++) {
            String[] row = rows.get(i);
            try {
                if (row.length < 4) throw new IllegalArgumentException("Requires name,email,password,roleName");
                String name = trim(row, 0);
                String email = trim(row, 1).toLowerCase();
                String password = trim(row, 2);
                String roleName = trim(row, 3).toUpperCase();
                String teamName = row.length > 4 ? trim(row, 4) : "";
                String deptName = row.length > 5 ? trim(row, 5) : "";

                if (name.isEmpty() || email.isEmpty() || password.isEmpty() || roleName.isEmpty())
                    throw new IllegalArgumentException("name, email, password, roleName are required");

                if (userRepository.findByEmail(email).isPresent())
                    throw new IllegalArgumentException("Email already exists: " + email);

                int roleLevel = roleLevelFor(roleName);
                String springRole = "ROLE_" + roleName;

                UUID uid = UUID.randomUUID();
                User user = User.builder()
                        .id(uid).email(email).name(name)
                        .passwordHash(passwordEncoder.encode(password))
                        .role(springRole).organizationId(orgId)
                        .build();
                userRepository.save(user);

                UserProfile profile = UserProfile.builder()
                        .id(uid).email(email).name(name)
                        .role(springRole).organizationId(orgId)
                        .build();
                userProfileRepository.save(profile);

                UUID teamId = teamMap.get(teamName.toLowerCase());
                UUID deptId = deptMap.get(deptName.toLowerCase());

                UserRole role = UserRole.builder()
                        .id(UUID.randomUUID()).userId(uid)
                        .organizationId(orgId).roleName(roleName)
                        .roleLevel(roleLevel).teamId(teamId).departmentId(deptId)
                        .build();
                userRoleRepository.save(role);

                if (teamId != null) {
                    TeamMember tm = TeamMember.builder()
                            .id(UUID.randomUUID()).teamId(teamId).userId(uid).role("MEMBER")
                            .build();
                    teamMemberRepository.save(tm);
                }
                ok++;
            } catch (Exception e) {
                fail++;
                errors.add("Row " + (i + 2) + ": " + e.getMessage());
            }
        }
        return new BulkUploadResult(ok, fail, errors);
    }

    // -------------------------------------------------------------------------
    // Tasks: CSV columns → projectKey,title,description,priority,type,dueDate,assigneeEmail
    // -------------------------------------------------------------------------
    @Transactional
    public BulkUploadResult uploadTasks(MultipartFile file) {
        UUID orgId = requireOrgId();
        List<String[]> rows = parseCsv(file);
        int ok = 0; int fail = 0; List<String> errors = new ArrayList<>();

        Map<String, UUID> teamMap = new HashMap<>();
        teamRepository.findByOrganizationId(orgId).forEach(t -> teamMap.put(t.getName().toLowerCase(), t.getId()));

        for (int i = 0; i < rows.size(); i++) {
            String[] row = rows.get(i);
            try {
                if (row.length < 2) throw new IllegalArgumentException("Requires projectKey,title");
                String projectKey = trim(row, 0).toUpperCase();
                String title = trim(row, 1);
                String description = row.length > 2 ? trim(row, 2) : "";
                String priority = row.length > 3 ? trim(row, 3).toUpperCase() : "MEDIUM";
                String taskType = row.length > 4 ? trim(row, 4).toUpperCase() : "TASK";
                String dueDateStr = row.length > 5 ? trim(row, 5) : "";
                String assigneeEmail = row.length > 6 ? trim(row, 6).toLowerCase() : "";

                if (title.isEmpty()) throw new IllegalArgumentException("title is blank");

                var project = projectRepository.findByOrganizationIdAndKey(orgId, projectKey)
                        .orElseThrow(() -> new IllegalArgumentException("Project key not found: " + projectKey));

                // Ensure current user is a project member for service-level checks
                // We call TaskService which handles counter + displayId
                TaskRequest req = new TaskRequest();
                req.setProjectId(project.getId());
                req.setTitle(title);
                req.setDescription(description.isEmpty() ? null : description);
                req.setPriority(priority);
                req.setTaskType(taskType);
                if (!dueDateStr.isEmpty()) {
                    try { req.setDueDate(Instant.parse(dueDateStr)); } catch (Exception ignored) {}
                }

                String teamName = row.length > 7 ? trim(row, 7) : "";
                if (!teamName.isEmpty()) {
                    UUID tId = teamMap.get(teamName.toLowerCase());
                    if (tId != null) req.setTeamId(tId);
                }

                TaskResponse created = taskService.createTask(req);

                // Assign if assigneeEmail given
                if (!assigneeEmail.isEmpty()) {
                    userRepository.findByEmail(assigneeEmail).ifPresent(u -> {
                        // Check project member
                        projectMemberRepository.findByProjectIdAndUserId(project.getId(), u.getId())
                            .ifPresent(pm -> {
                                TaskAssignment ta = TaskAssignment.builder()
                                        .id(UUID.randomUUID())
                                        .taskId(created.getId())
                                        .userId(u.getId())
                                        .role("ASSIGNEE")
                                        .build();
                                taskAssignmentRepository.save(ta);
                            });
                    });
                }
                ok++;
            } catch (Exception e) {
                fail++;
                errors.add("Row " + (i + 2) + ": " + e.getMessage());
            }
        }
        return new BulkUploadResult(ok, fail, errors);
    }

    // -------------------------------------------------------------------------
    // Assignments: CSV columns → taskDisplayId,assigneeEmail
    // -------------------------------------------------------------------------
    @Transactional
    public BulkUploadResult uploadAssignments(MultipartFile file) {
        UUID orgId = requireOrgId();
        List<String[]> rows = parseCsv(file);
        int ok = 0; int fail = 0; List<String> errors = new ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            String[] row = rows.get(i);
            try {
                if (row.length < 2) throw new IllegalArgumentException("Requires taskDisplayId,assigneeEmail");
                String displayId = trim(row, 0).toUpperCase();
                String assigneeEmail = trim(row, 1).toLowerCase();

                Task task = taskRepository.findByDisplayId(displayId)
                        .orElseThrow(() -> new IllegalArgumentException("Task not found: " + displayId));
                if (!task.getOrganizationId().equals(orgId))
                    throw new TenantIsolationException("Task does not belong to this org");

                User assignee = userRepository.findByEmail(assigneeEmail)
                        .orElseThrow(() -> new IllegalArgumentException("User not found: " + assigneeEmail));

                // Avoid duplicate assignment
                boolean exists = taskAssignmentRepository.findByTaskId(task.getId()).stream()
                        .anyMatch(ta -> ta.getUserId().equals(assignee.getId()));
                if (exists) throw new IllegalArgumentException("Already assigned: " + assigneeEmail);

                TaskAssignment ta = TaskAssignment.builder()
                        .id(UUID.randomUUID()).taskId(task.getId())
                        .userId(assignee.getId()).role("ASSIGNEE")
                        .build();
                taskAssignmentRepository.save(ta);
                ok++;
            } catch (Exception e) {
                fail++;
                errors.add("Row " + (i + 2) + ": " + e.getMessage());
            }
        }
        return new BulkUploadResult(ok, fail, errors);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    private UUID requireOrgId() {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) throw new TenantIsolationException("No org context");
        return orgId;
    }

    private List<String[]> parseCsv(MultipartFile file) {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            // Skip header
            String header = br.readLine();
            if (header == null) return rows;
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                rows.add(line.split(",", -1));
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to parse CSV: " + e.getMessage());
        }
        return rows;
    }

    private String trim(String[] row, int idx) {
        return idx < row.length ? row[idx].trim().replace("\"", "") : "";
    }

    private int roleLevelFor(String roleName) {
        return switch (roleName) {
            case "SUPER_ADMIN" -> 10;
            case "ORG_OWNER"   -> 5;
            case "ORG_ADMIN"   -> 4;
            case "DEPT_HEAD"   -> 3;
            case "TEAM_LEAD"   -> 2;
            case "GUEST"       -> 0;
            default            -> 1; // TEAM_MEMBER
        };
    }
}
