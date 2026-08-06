package com.claudelens.backend.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Document(collection = "git_commit_logs")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GitCommitLog {

    @Id
    private String id;

    @Field("project_id")
    private UUID projectId;

    @Field("commit_hash")
    private String commitHash;

    private String message;

    @Field("files_changed")
    private List<String> filesChanged;

    @Field("committed_at")
    private LocalDateTime committedAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
