package com.taskflow.modules.task.repository;

import com.taskflow.modules.task.domain.CustomFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomFieldValueRepository extends JpaRepository<CustomFieldValue, UUID> {
    List<CustomFieldValue> findByTaskId(UUID taskId);
    List<CustomFieldValue> findByCustomFieldId(UUID customFieldId);
    Optional<CustomFieldValue> findByTaskIdAndCustomFieldId(UUID taskId, UUID customFieldId);
    void deleteByTaskId(UUID taskId);
}
