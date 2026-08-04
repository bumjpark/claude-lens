package com.claudelens.backend.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class PaymentPrepareResponse {
    private String orderId;
    private Integer amount;
    private String orderName;
}
