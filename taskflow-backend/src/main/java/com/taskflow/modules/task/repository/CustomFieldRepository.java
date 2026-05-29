package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.CustomField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CustomFieldRepository extends JpaRepository<CustomField, UUID> {
    List<CustomField> findByProjectId(UUID projectId);
}
