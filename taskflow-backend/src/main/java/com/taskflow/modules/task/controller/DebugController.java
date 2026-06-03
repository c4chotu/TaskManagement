package com.taskflow.modules.task.controller;

import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.repository.IssueDetailRepository;
import com.taskflow.modules.project.repository.ProjectRepository;
import com.taskflow.modules.project.repository.ProjectMemberRepository;
import com.taskflow.modules.auth.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/debug-all")
public class DebugController {

    private final TaskRepository taskRepository;
    private final IssueDetailRepository issueDetailRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    public DebugController(TaskRepository taskRepository,
                           IssueDetailRepository issueDetailRepository,
                           ProjectRepository projectRepository,
                           ProjectMemberRepository projectMemberRepository,
                           UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.issueDetailRepository = issueDetailRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDebugInfo() {
        Map<String, Object> map = new HashMap<>();
        try {
            map.put("tasksCount", taskRepository.count());
            map.put("tasks", taskRepository.findAll());
            map.put("issuesCount", issueDetailRepository.count());
            map.put("issues", issueDetailRepository.findAll());
            map.put("projectsCount", projectRepository.count());
            map.put("projects", projectRepository.findAll());
            map.put("projectMembersCount", projectMemberRepository.count());
            map.put("projectMembers", projectMemberRepository.findAll());
            map.put("usersCount", userRepository.count());
            map.put("users", userRepository.findAll());
        } catch (Exception e) {
            map.put("error", e.getMessage());
        }
        return ResponseEntity.ok(map);
    }
}
