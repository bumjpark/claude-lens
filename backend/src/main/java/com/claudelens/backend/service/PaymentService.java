package com.claudelens.backend.service;

import com.claudelens.backend.client.TossPaymentsClient;
import com.claudelens.backend.domain.Payment;
import com.claudelens.backend.domain.PaymentStatus;
import com.claudelens.backend.domain.Project;
import com.claudelens.backend.domain.User;
import com.claudelens.backend.dto.payment.PaymentConfirmRequest;
import com.claudelens.backend.dto.payment.PaymentPrepareResponse;
import com.claudelens.backend.repository.PaymentRepository;
import com.claudelens.backend.repository.ProjectRepository;
import com.claudelens.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    // 리포트 전체 열람 가격. 프로젝트당 1회 결제.
    private static final int REPORT_UNLOCK_PRICE = 1500;

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PaymentRepository paymentRepository;
    private final TossPaymentsClient tossPaymentsClient;

    @Transactional
    public PaymentPrepareResponse prepare(String email, UUID projectId) {
        User user = getUser(email);
        Project project = getOwnedProject(user, projectId);

        String orderId = "report-" + project.getId() + "-" + UUID.randomUUID();
        Payment payment = Payment.builder()
                .project(project)
                .user(user)
                .orderId(orderId)
                .amount(REPORT_UNLOCK_PRICE)
                .status(PaymentStatus.PENDING)
                .build();
        paymentRepository.save(payment);

        return PaymentPrepareResponse.builder()
                .orderId(orderId)
                .amount(REPORT_UNLOCK_PRICE)
                .orderName(project.getName() + " 리포트 전체 열람")
                .build();
    }

    @Transactional
    public void confirm(String email, PaymentConfirmRequest request) {
        User user = getUser(email);
        Payment payment = paymentRepository.findByOrderId(request.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("결제 정보를 찾을 수 없습니다"));

        if (!payment.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("본인의 결제만 승인할 수 있습니다");
        }
        // 이미 승인된 결제를 다시 confirm 하는 경우(중복 콜백 등) 조용히 성공 처리
        if (payment.getStatus() == PaymentStatus.PAID) {
            return;
        }
        if (!payment.getAmount().equals(request.getAmount())) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new IllegalArgumentException("결제 금액이 일치하지 않습니다");
        }

        try {
            tossPaymentsClient.confirm(request.getPaymentKey(), request.getOrderId(), request.getAmount());
        } catch (RestClientException e) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new IllegalArgumentException("결제 승인에 실패했습니다");
        }

        payment.setStatus(PaymentStatus.PAID);
        payment.setTossPaymentKey(request.getPaymentKey());
        payment.setApprovedAt(LocalDateTime.now());
        paymentRepository.save(payment);
    }

    @Transactional(readOnly = true)
    public boolean isPaid(String email, UUID projectId) {
        User user = getUser(email);
        Project project = getOwnedProject(user, projectId);
        return paymentRepository.existsByProjectIdAndStatus(project.getId(), PaymentStatus.PAID);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("유저를 찾을 수 없습니다"));
    }

    private Project getOwnedProject(User user, UUID projectId) {
        return projectRepository.findByIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("프로젝트를 찾을 수 없습니다"));
    }
}
