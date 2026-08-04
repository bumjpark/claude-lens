package com.claudelens.backend.controller;

import com.claudelens.backend.dto.payment.PaymentConfirmRequest;
import com.claudelens.backend.dto.payment.PaymentPrepareResponse;
import com.claudelens.backend.dto.payment.PaymentStatusResponse;
import com.claudelens.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // 결제창을 띄우기 전, 서버에서 주문(orderId)을 먼저 만든다 (금액을 프론트에서 조작 못 하게).
    @PostMapping("/prepare")
    public ResponseEntity<PaymentPrepareResponse> prepare(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(paymentService.prepare(userDetails.getUsername(), projectId));
    }

    // 토스 결제창 successUrl 콜백에서 호출. 서버가 시크릿 키로 최종 승인해야 실제 결제 완료.
    @PostMapping("/confirm")
    public ResponseEntity<Void> confirm(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID projectId,
            @Valid @RequestBody PaymentConfirmRequest request) {
        paymentService.confirm(userDetails.getUsername(), request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/status")
    public ResponseEntity<PaymentStatusResponse> status(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID projectId) {
        return ResponseEntity.ok(new PaymentStatusResponse(paymentService.isPaid(userDetails.getUsername(), projectId)));
    }
}
