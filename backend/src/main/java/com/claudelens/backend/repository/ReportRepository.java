package com.claudelens.backend.repository;

import com.claudelens.backend.domain.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {
}
