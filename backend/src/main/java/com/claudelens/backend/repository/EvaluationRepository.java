package com.claudelens.backend.repository;

import com.claudelens.backend.domain.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {
}
