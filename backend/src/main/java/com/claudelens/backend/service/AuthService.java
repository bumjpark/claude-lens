package com.claudelens.backend.service;

import com.claudelens.backend.domain.User;
import com.claudelens.backend.dto.AuthResponse;
import com.claudelens.backend.dto.LoginRequest;
import com.claudelens.backend.dto.SignupRequest;
import com.claudelens.backend.repository.UserRepository;
import com.claudelens.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    // 회원가입
    @Transactional
    public AuthResponse signup(SignupRequest request) {

        // 이메일 중복 체크
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 사용중인 이메일입니다");
        }

        // 유저 저장
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .role(request.getRole())
                .experienceLevel(request.getExperienceLevel())
                .build();

        userRepository.save(user);

        // 토큰 발급
        String token = jwtTokenProvider.generateToken(user.getEmail());

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .email(user.getEmail())
                .name(user.getName())
                .build();
    }

    // 로그인
    public AuthResponse login(LoginRequest request) {

        // 이메일/비밀번호 검증
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        // 토큰 발급
        String token = jwtTokenProvider.generateToken(request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다"));

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .email(user.getEmail())
                .name(user.getName())
                .build();
    }
}
