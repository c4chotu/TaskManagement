package com.taskflow.modules.file.service;

import com.taskflow.common.exception.EntityNotFoundException;
import com.taskflow.common.exception.UnauthorizedException;
import com.taskflow.common.security.SecurityContextHelper;
import com.taskflow.modules.file.domain.FileAttachment;
import com.taskflow.modules.file.repository.FileAttachmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class FileService {

    private final FileAttachmentRepository fileAttachmentRepository;
    private final Path uploadDir;

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024L; // 50 MB

    public FileService(FileAttachmentRepository fileAttachmentRepository,
                       @Value("${app.file.upload-dir:./uploads}") String uploadDirPath) {
        this.fileAttachmentRepository = fileAttachmentRepository;
        this.uploadDir = Paths.get(uploadDirPath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + uploadDirPath, e);
        }
    }

    @Transactional
    public FileAttachment uploadFile(MultipartFile file, String entityType, UUID entityId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        UUID orgId = SecurityContextHelper.getCurrentOrgId();

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds the 50MB limit");
        }

        String originalFilename = sanitizeFilename(Objects.requireNonNull(file.getOriginalFilename()));
        String storedFilename = UUID.randomUUID() + "_" + originalFilename;
        Path targetPath = this.uploadDir.resolve(storedFilename);

        try {
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + originalFilename, e);
        }

        FileAttachment attachment = FileAttachment.builder()
                .id(UUID.randomUUID())
                .originalFilename(originalFilename)
                .storedFilename(storedFilename)
                .contentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileSize(file.getSize())
                .storageProvider("LOCAL")
                .storagePath(targetPath.toString())
                .entityType(entityType)
                .entityId(entityId)
                .uploadedBy(userId)
                .organizationId(orgId)
                .build();

        return fileAttachmentRepository.save(attachment);
    }

    @Transactional(readOnly = true)
    public Resource downloadFile(UUID fileId) {
        FileAttachment attachment = fileAttachmentRepository.findById(fileId)
                .orElseThrow(() -> new EntityNotFoundException("File not found: " + fileId));

        verifyOrgAccess(attachment);

        try {
            Path filePath = Paths.get(attachment.getStoragePath());
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists()) {
                throw new EntityNotFoundException("Physical file missing for id: " + fileId);
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new RuntimeException("Could not read file: " + fileId, e);
        }
    }

    @Transactional(readOnly = true)
    public List<FileAttachment> listFiles(String entityType, UUID entityId) {
        return fileAttachmentRepository.findByEntityTypeAndEntityId(entityType, entityId);
    }

    @Transactional
    public void deleteFile(UUID fileId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        FileAttachment attachment = fileAttachmentRepository.findById(fileId)
                .orElseThrow(() -> new EntityNotFoundException("File not found: " + fileId));

        if (!Objects.equals(attachment.getUploadedBy(), userId)) {
            throw new UnauthorizedException("Only the uploader can delete this file");
        }

        // Delete physical file
        try {
            Files.deleteIfExists(Paths.get(attachment.getStoragePath()));
        } catch (IOException e) {
            // Log but do not block — DB record must be removed regardless
        }

        fileAttachmentRepository.delete(attachment);
    }

    @Transactional(readOnly = true)
    public FileAttachment getMetadata(UUID fileId) {
        FileAttachment attachment = fileAttachmentRepository.findById(fileId)
                .orElseThrow(() -> new EntityNotFoundException("File not found: " + fileId));
        verifyOrgAccess(attachment);
        return attachment;
    }

    // --- Private helpers ---

    private void verifyOrgAccess(FileAttachment attachment) {
        UUID orgId = SecurityContextHelper.getCurrentOrgId();
        if (!Objects.equals(attachment.getOrganizationId(), orgId)) {
            throw new UnauthorizedException("Cross-tenant file access blocked");
        }
    }

    private String sanitizeFilename(String filename) {
        // Remove path traversal sequences and special characters
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
