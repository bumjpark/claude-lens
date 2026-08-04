package com.claudelens.backend.repository;

import com.claudelens.backend.domain.Payment;
import com.claudelens.backend.domain.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByOrderId(String orderId);
    boolean existsByProjectIdAndStatus(UUID projectId, PaymentStatus status);
}
