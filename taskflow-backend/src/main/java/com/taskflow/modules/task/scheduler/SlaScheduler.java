package com.taskflow.modules.task.scheduler;

import com.taskflow.modules.task.domain.IssueDetail;
import com.taskflow.modules.task.domain.Task;
import com.taskflow.modules.task.repository.IssueDetailRepository;
import com.taskflow.modules.task.repository.TaskRepository;
import com.taskflow.modules.task.service.IssueService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class SlaScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaScheduler.class);

    private final IssueDetailRepository issueDetailRepository;
    private final TaskRepository taskRepository;
    private final IssueService issueService;

    public SlaScheduler(IssueDetailRepository issueDetailRepository,
                        TaskRepository taskRepository,
                        IssueService issueService) {
        this.issueDetailRepository = issueDetailRepository;
        this.taskRepository = taskRepository;
        this.issueService = issueService;
    }

    @Scheduled(cron = "0 */5 * * * *") // Run every 5 minutes
    @Transactional
    public void checkSlaBreaches() {
        log.info("Starting SLA breach check cycle...");

        List<IssueDetail> activeIssues = issueDetailRepository.findAll();
        Instant now = Instant.now();

        for (IssueDetail detail : activeIssues) {
            Task task = taskRepository.findById(detail.getTaskId()).orElse(null);
            if (task == null || task.getDeletedAt() != null) {
                continue;
            }

            // Check if issue is already resolved/closed
            // For tasks, we can check if task status name contains CLOSED, DONE, DUPLICATE, VERIFYING, VERIFIED, resolved
            String statusIdStr = task.getStatusId() != null ? task.getStatusId().toString() : "";
            // We'll also check if the issue has a root cause / resolution which means it is resolved
            if (detail.getRootCause() != null && detail.getResolution() != null) {
                continue;
            }

            // 1. Response SLA check
            if (detail.getRespondedAt() == null && now.isAfter(detail.getResponseDueAt())) {
                // Check if already escalated for response breach (e.g. escalationCount == 0)
                if (task.getEscalationCount() == 0) {
                    issueService.escalateIssue(detail.getTaskId(), "Response SLA Breached! Target was: " + detail.getResponseDueAt());
                }
            }

            // 2. Resolution/Fix SLA check
            if (now.isAfter(detail.getFixDueAt())) {
                // Determine escalation level based on elapsed time since fix due
                long overdueMinutes = java.time.Duration.between(detail.getFixDueAt(), now).toMinutes();
                
                // Escalate once every 30 minutes if breached up to max 3 levels
                int expectedEscalationCount = (int) (overdueMinutes / 30) + 1;
                if (expectedEscalationCount > 3) {
                    expectedEscalationCount = 3;
                }

                if (task.getEscalationCount() < expectedEscalationCount) {
                    issueService.escalateIssue(detail.getTaskId(), "Fix SLA Breached by " + overdueMinutes + " minutes! Target was: " + detail.getFixDueAt());
                }
            }
        }
    }
}
