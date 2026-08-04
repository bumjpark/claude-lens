package com.claudelens.backend.dto.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class PaymentConfirmRequest {

    @NotBlank(message = "orderId가 필요합니다")
    private String orderId;

    @NotBlank(message = "paymentKey가 필요합니다")
    private String paymentKey;

    @NotNull(message = "amount가 필요합니다")
    private Integer amount;
}
