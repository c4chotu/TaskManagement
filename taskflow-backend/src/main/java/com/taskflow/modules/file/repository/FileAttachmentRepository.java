package com.taskflow.modules.file.repository;

import com.taskflow.modules.file.domain.FileAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FileAttachmentRepository extends JpaRepository<FileAttachment, UUID> {
    List<FileAttachment> findByEntityTypeAndEntityId(String entityType, UUID entityId);
    List<FileAttachment> findByOrganizationId(UUID organizationId);
    void deleteByEntityTypeAndEntityId(String entityType, UUID entityId);
}
