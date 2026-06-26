package com.claudelens.backend.repository;

import com.claudelens.backend.domain.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface RecommendationRepository extends JpaRepository<Recommendation, UUID> {
}
