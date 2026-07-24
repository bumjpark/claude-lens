package com.claudelens.backend.dto.ingest;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class IngestStatusResponse {
    private long totalLogs;
    private long retryCount;
    private double retryRate;
    private long codeRequestCount;
    private long errorRequestCount;
    private long reviewRequestCount;
    private long designRequestCount;
}
