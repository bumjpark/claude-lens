package com.claudelens.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class SignupRequest {

    @Email(message = "이메일 형식이 올바르지 않습니다")
    @NotBlank(message = "이메일을 입력해주세요")
    private String email;

    @NotBlank(message = "비밀번호를 입력해주세요")
    private String password;

    @NotBlank(message = "이름을 입력해주세요")
    private String name;

    @NotBlank(message = "직무를 입력해주세요")
    private String role;

    @NotBlank(message = "경력을 입력해주세요")
    private String experienceLevel;
}
