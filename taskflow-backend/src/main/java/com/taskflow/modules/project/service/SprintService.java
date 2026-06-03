package com.taskflow.modules.project.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.modules.project.domain.Sprint;
import com.taskflow.modules.project.repository.SprintRepository;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SprintService {

    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;

    public SprintService(SprintRepository sprintRepository, TaskRepository taskRepository) {
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional
    public Sprint createSprint(UUID projectId, String name, String goal, Instant startDate, Instant endDate, Double estimatedHours, String status) {
        Sprint sprint = Sprint.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name(name)
                .goal(goal)
                .startDate(startDate)
                .endDate(endDate)
                .estimatedHours(estimatedHours)
                .status(status != null ? status : "PLANNED")
                .build();
        return sprintRepository.save(sprint);
    }

    @Transactional(readOnly = true)
    public List<Sprint> listSprintsByProject(UUID projectId) {
        return sprintRepository.findByProjectIdOrderByStartDateAsc(projectId);
    }

    @Transactional(readOnly = true)
    public Sprint getSprint(UUID sprintId) {
        return sprintRepository.findById(sprintId)
                .orElseThrow(() -> new EntityNotFoundException("Sprint not found with ID: " + sprintId));
    }

    @Transactional
    public Sprint updateSprint(UUID sprintId, String name, String goal, Instant startDate, Instant endDate, Double estimatedHours, String status) {
        Sprint sprint = getSprint(sprintId);
        if (name != null) sprint.setName(name);
        if (goal != null) sprint.setGoal(goal);
        if (startDate != null) sprint.setStartDate(startDate);
        if (endDate != null) sprint.setEndDate(endDate);
        if (estimatedHours != null) sprint.setEstimatedHours(estimatedHours);
        if (status != null) sprint.setStatus(status);
        return sprintRepository.save(sprint);
    }

    @Transactional
    public void deleteSprint(UUID sprintId) {
        Sprint sprint = getSprint(sprintId);
        // Clear sprint_id from tasks
        List<Task> tasks = taskRepository.findAll().stream()
                .filter(t -> sprintId.equals(t.getSprintId()))
                .collect(Collectors.toList());
        for (Task t : tasks) {
            t.setSprintId(null);
            taskRepository.save(t);
        }
        sprintRepository.delete(sprint);
    }

    @Transactional(readOnly = true)
    public List<UUID> getTaskIdsForSprint(UUID sprintId) {
        return taskRepository.findAll().stream()
                .filter(t -> sprintId.equals(t.getSprintId()))
                .map(Task::getId)
                .collect(Collectors.toList());
    }
}
