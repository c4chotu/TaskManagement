package com.taskflow.modules.reporting.service;

import com.taskflow.modules.reporting.domain.ReportJob;
import com.taskflow.modules.reporting.repository.ReportJobRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
public class ReportAsyncService {

    private final ReportJobRepository reportJobRepository;

    public ReportAsyncService(ReportJobRepository reportJobRepository) {
        this.reportJobRepository = reportJobRepository;
    }

    @Async
    public void generateReportAsync(UUID jobId, UUID orgId, UUID projectId, String filterType, List<String> columns) {
        try {
            // Simulate heavy load
            Thread.sleep(2000);

            Path tempDir = Paths.get(System.getProperty("java.io.tmpdir"), "taskflow_reports");
            if (!Files.exists(tempDir)) {
                Files.createDirectories(tempDir);
            }

            Path file = tempDir.resolve("report_" + jobId + ".csv");
            try (FileWriter writer = new FileWriter(file.toFile())) {
                writer.append(String.join(",", columns)).append("\n");
                writer.append("mock-id,mock-title,mock-project,mock-status,mock-priority,mock-date\n");
            }

            ReportJob job = reportJobRepository.findById(jobId).orElse(null);
            if (job != null) {
                job.setStatus("COMPLETED");
                job.setFilePath(file.toString());
                reportJobRepository.save(job);
            }
        } catch (Exception e) {
            ReportJob job = reportJobRepository.findById(jobId).orElse(null);
            if (job != null) {
                job.setStatus("FAILED");
                reportJobRepository.save(job);
            }
        }
    }
}
