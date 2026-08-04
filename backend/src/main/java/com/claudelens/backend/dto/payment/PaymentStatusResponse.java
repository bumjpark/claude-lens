package com.claudelens.backend.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PaymentStatusResponse {
    private boolean paid;
}
