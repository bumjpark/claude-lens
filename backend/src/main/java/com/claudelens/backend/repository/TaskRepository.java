package com.claudelens.backend.repository;

import com.claudelens.backend.domain.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
}
