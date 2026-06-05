package com.taskflow.modules.project.controller;

import com.taskflow.modules.project.domain.Phase;
import com.taskflow.modules.project.repository.PhaseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects")
public class PhaseController {

    private final PhaseRepository phaseRepository;

    public PhaseController(PhaseRepository phaseRepository) {
        this.phaseRepository = phaseRepository;
    }

    @GetMapping("/{projectId}/phases")
    public ResponseEntity<List<Phase>> listPhases(@PathVariable UUID projectId) {
        return ResponseEntity.ok(phaseRepository.findByProjectId(projectId));
    }
}
