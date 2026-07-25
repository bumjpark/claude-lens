package com.claudelens.backend.security;

import com.claudelens.backend.domain.Project;
import com.claudelens.backend.repository.ProjectRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

// CLI가 보내는 요청을 X-API-Key 헤더로 인증한다. Project별 apiKey와 대조해서
// 인증된 projectId를 request attribute로 남기고, 이후 컨트롤러/서비스에서
// 요청 본문의 projectId와 실제로 일치하는지 다시 검증한다.
@Component
@RequiredArgsConstructor
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    public static final String AUTHENTICATED_PROJECT_ID_ATTRIBUTE = "authenticatedProjectId";
    private static final String API_KEY_HEADER = "X-API-Key";

    private final ProjectRepository projectRepository;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/ingest");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain)
            throws ServletException, IOException {

        String apiKey = request.getHeader(API_KEY_HEADER);

        if (!StringUtils.hasText(apiKey)) {
            reject(response, "X-API-Key 헤더가 필요합니다");
            return;
        }

        Optional<Project> project = projectRepository.findByApiKey(apiKey);
        if (project.isEmpty()) {
            reject(response, "유효하지 않은 API Key 입니다");
            return;
        }

        request.setAttribute(AUTHENTICATED_PROJECT_ID_ATTRIBUTE, project.get().getId());
        filterChain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
