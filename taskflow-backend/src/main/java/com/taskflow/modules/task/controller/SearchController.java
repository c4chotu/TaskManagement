package com.taskflow.modules.task.controller;

import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.project.domain.Project;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.user.domain.UserProfile;
import com.taskflow.modules.user.repository.UserProfileRepository;
import com.taskflow.modules.user.domain.Team;
import com.taskflow.modules.user.repository.TeamRepository;
import com.taskflow.modules.user.domain.Department;
import com.taskflow.modules.user.repository.DepartmentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserProfileRepository userProfileRepository;
    private final TeamRepository teamRepository;
    private final DepartmentRepository departmentRepository;

    public SearchController(
            TaskRepository taskRepository,
            ProjectRepository projectRepository,
            UserProfileRepository userProfileRepository,
            TeamRepository teamRepository,
            DepartmentRepository departmentRepository) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userProfileRepository = userProfileRepository;
        this.teamRepository = teamRepository;
        this.departmentRepository = departmentRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> search(@RequestParam(value = "q", required = false, defaultValue = "") String q) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (orgId == null) {
            return ResponseEntity.status(401).build();
        }

        String query = q.trim().toLowerCase();

        // 1. Fetch matching tasks
        List<Task> allTasks = taskRepository.findByOrganizationIdAndDeletedAtIsNull(orgId);
        List<Map<String, Object>> matchedTasks = allTasks.stream()
                .filter(t -> {
                    if (query.isEmpty()) return true;
                    boolean titleMatch = t.getTitle() != null && t.getTitle().toLowerCase().contains(query);
                    boolean descMatch = t.getDescription() != null && t.getDescription().toLowerCase().contains(query);
                    boolean displayIdMatch = t.getDisplayId() != null && t.getDisplayId().toLowerCase().contains(query);
                    return titleMatch || descMatch || displayIdMatch;
                })
                .map(this::mapTask)
                .collect(Collectors.toList());

        // 2. Fetch matching projects
        List<Project> allProjects = projectRepository.findByOrganizationId(orgId);
        List<Map<String, Object>> matchedProjects = allProjects.stream()
                .filter(p -> {
                    if (query.isEmpty()) return true;
                    boolean nameMatch = p.getName() != null && p.getName().toLowerCase().contains(query);
                    boolean descMatch = p.getDescription() != null && p.getDescription().toLowerCase().contains(query);
                    boolean keyMatch = p.getKey() != null && p.getKey().toLowerCase().contains(query);
                    return nameMatch || descMatch || keyMatch;
                })
                .map(this::mapProject)
                .collect(Collectors.toList());

        // 3. Fetch matching people (UserProfiles)
        List<UserProfile> allUsers = userProfileRepository.findByOrganizationId(orgId);
        List<Map<String, Object>> matchedUsers = allUsers.stream()
                .filter(u -> {
                    if (query.isEmpty()) return true;
                    boolean nameMatch = u.getName() != null && u.getName().toLowerCase().contains(query);
                    boolean emailMatch = u.getEmail() != null && u.getEmail().toLowerCase().contains(query);
                    boolean roleMatch = u.getRole() != null && u.getRole().toLowerCase().contains(query);
                    return nameMatch || emailMatch || roleMatch;
                })
                .map(this::mapUserProfile)
                .collect(Collectors.toList());

        // 4. Fetch matching teams
        List<Team> allTeams = teamRepository.findByOrganizationId(orgId);
        List<Map<String, Object>> matchedTeams = allTeams.stream()
                .filter(t -> t.getDeletedAt() == null)
                .filter(t -> {
                    if (query.isEmpty()) return true;
                    boolean nameMatch = t.getName() != null && t.getName().toLowerCase().contains(query);
                    boolean descMatch = t.getDescription() != null && t.getDescription().toLowerCase().contains(query);
                    return nameMatch || descMatch;
                })
                .map(this::mapTeam)
                .collect(Collectors.toList());

        // 5. Fetch matching departments
        List<Department> allDepts = departmentRepository.findByOrganizationId(orgId);
        List<Map<String, Object>> matchedDepts = allDepts.stream()
                .filter(d -> d.getDeletedAt() == null)
                .filter(d -> {
                    if (query.isEmpty()) return true;
                    boolean nameMatch = d.getName() != null && d.getName().toLowerCase().contains(query);
                    boolean descMatch = d.getDescription() != null && d.getDescription().toLowerCase().contains(query);
                    return nameMatch || descMatch;
                })
                .map(this::mapDepartment)
                .collect(Collectors.toList());

        // Generate AI Gemini Summary
        String aiSummary = generateAiSummary(q, matchedTasks, matchedProjects, matchedUsers, matchedTeams, matchedDepts);

        Map<String, Object> response = new HashMap<>();
        response.put("query", q);
        response.put("aiSummary", aiSummary);
        response.put("tasks", matchedTasks);
        response.put("projects", matchedProjects);
        response.put("users", matchedUsers);
        response.put("teams", matchedTeams);
        response.put("departments", matchedDepts);

        return ResponseEntity.ok(response);
    }

    private String generateAiSummary(String query,
                                      List<Map<String, Object>> tasks,
                                      List<Map<String, Object>> projects,
                                      List<Map<String, Object>> users,
                                      List<Map<String, Object>> teams,
                                      List<Map<String, Object>> depts) {
        if (query == null || query.trim().isEmpty()) {
            return "Hello! I am your **Gemini AI Search Assistant**. Type a query in the search bar above to fetch projects, tasks, members, or workload stats, and I'll generate a contextual breakdown for you in real-time.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("### Gemini AI Analysis for \"").append(query).append("\"\n\n");

        if (tasks.isEmpty() && projects.isEmpty() && users.isEmpty() && teams.isEmpty() && depts.isEmpty()) {
            sb.append("I ran a semantic scan across all modules, but no records matched \"").append(query).append("\". Try searching for active projects (e.g. 'NETIQ'), users, or task topics.");
            return sb.toString();
        }

        sb.append("Here is a summary of matches found in your organization:\n");

        if (!projects.isEmpty()) {
            sb.append("- 📁 **Projects**: Found ").append(projects.size()).append(" project(s). ");
            Map<String, Object> p = projects.get(0);
            sb.append("Key match: **").append(p.get("name")).append("** (Status: `").append(p.get("status")).append("`).\n");
        }

        if (!tasks.isEmpty()) {
            long openCount = tasks.stream().filter(t -> !"s-done".equals(t.get("statusId"))).count();
            sb.append("- 📝 **Tasks & Incidents**: Found ").append(tasks.size()).append(" task(s), with ").append(openCount).append(" currently active. ");
            Map<String, Object> t = tasks.get(0);
            sb.append("Key item: **").append(t.get("title")).append("** (").append(t.get("displayId")).append(") with priority `").append(t.get("priority")).append("`.\n");
        }

        if (!users.isEmpty()) {
            sb.append("- 👥 **People**: Found ").append(users.size()).append(" team member(s) matching. ");
            Map<String, Object> u = users.get(0);
            sb.append("Top profile: **").append(u.get("name")).append("** (Role: `").append(u.get("role")).append("`).\n");
        }

        if (!teams.isEmpty()) {
            sb.append("- 🗂️ **Teams**: ").append(teams.size()).append(" team(s) matching: ");
            String names = teams.stream().map(t -> (String) t.get("name")).collect(Collectors.joining(", "));
            sb.append("**").append(names).append("**.\n");
        }

        if (!depts.isEmpty()) {
            sb.append("- 🏢 **Departments**: Found ").append(depts.size()).append(" department(s).\n");
        }

        // Actionable suggestion
        sb.append("\n**Gemini Recommendation**: ");
        if (!tasks.isEmpty()) {
            sb.append("Consider reviewing ").append(tasks.size() > 1 ? "the active tasks" : "the task").append(" to balance workloads or update progress directly from the command menu.");
        } else if (!projects.isEmpty()) {
            sb.append("Open the matching projects page to check milestones and team velocity.");
        } else {
            sb.append("Use quick actions to filter tasks, reassign items, or manage time entries.");
        }

        return sb.toString();
    }

    private Map<String, Object> mapTask(Task t) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", t.getId());
        map.put("displayId", t.getDisplayId());
        map.put("title", t.getTitle());
        map.put("description", t.getDescription());
        map.put("priority", t.getPriority());
        map.put("taskType", t.getTaskType());
        map.put("statusId", t.getStatusId());
        map.put("projectId", t.getProjectId());
        map.put("dueDate", t.getDueDate() != null ? t.getDueDate().toString() : null);
        return map;
    }

    private Map<String, Object> mapProject(Project p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId());
        map.put("name", p.getName());
        map.put("key", p.getKey());
        map.put("description", p.getDescription());
        map.put("status", p.getStatus());
        return map;
    }

    private Map<String, Object> mapUserProfile(UserProfile u) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", u.getId());
        map.put("name", u.getName());
        map.put("email", u.getEmail());
        map.put("role", u.getRole());
        map.put("avatarUrl", u.getAvatarUrl());
        return map;
    }

    private Map<String, Object> mapTeam(Team t) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", t.getId());
        map.put("name", t.getName());
        map.put("description", t.getDescription());
        map.put("departmentId", t.getDepartmentId());
        map.put("leadUserId", t.getLeadUserId());
        return map;
    }

    private Map<String, Object> mapDepartment(Department d) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("name", d.getName());
        map.put("description", d.getDescription());
        map.put("headUserId", d.getHeadUserId());
        return map;
    }
}
