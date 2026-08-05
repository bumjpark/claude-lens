package com.claudelens.backend.dto.ingest;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.util.List;

@Getter
public class GitCommitLogBatchRequest {

    @NotNull
    private List<GitCommitLogRequest> commits;
}
