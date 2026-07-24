package com.claudelens.backend.dto.ingest;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.util.List;

@Getter
public class InteractionLogBatchRequest {

    @NotNull
    private List<InteractionLogRequest> logs;
}
