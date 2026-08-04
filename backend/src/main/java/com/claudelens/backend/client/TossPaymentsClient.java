package com.claudelens.backend.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Component
public class TossPaymentsClient {

    private final RestClient restClient;
    private final String secretKey;

    public TossPaymentsClient(@Value("${toss.secret-key}") String secretKey) {
        this.secretKey = secretKey;
        this.restClient = RestClient.builder()
                .baseUrl("https://api.tosspayments.com")
                .build();
    }

    // 결제창에서 발급받은 paymentKey를 서버가 시크릿 키로 최종 승인해야 실제로 결제가 완료된다.
    // (클라이언트 쪽 성공 콜백만 믿으면 위변조된 요청으로 결제 없이 잠금 해제될 수 있음)
    public void confirm(String paymentKey, String orderId, Integer amount) {
        String credentials = Base64.getEncoder()
                .encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));

        restClient.post()
                .uri("/v1/payments/confirm")
                .header(HttpHeaders.AUTHORIZATION, "Basic " + credentials)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "paymentKey", paymentKey,
                        "orderId", orderId,
                        "amount", amount))
                .retrieve()
                .toBodilessEntity();
    }
}
