package com.misa.user.controller;

import com.misa.user.dto.LoginRequestDTO;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AuthenticationManager authenticationManager;

    public UserController(AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    /* 클라이언트의 /login 요청을 처리 */
    @PostMapping("/login")
    public ResponseEntity<Void> login(@RequestBody LoginRequestDTO request, HttpSession session) {
        try {
            // 1. Spring Security를 통해 인증 시도(인증 토큰 생성)
            Authentication authentication =
                    /* 1-2. 1-1에서 생성된 인증요청서를 인증관리자(Authentication)에게 전달하여 실제 인증 시도
                    *  AuthenticationManager는 내부적으로 UserAuthService를 호출하여 DB 에서 사용자 정보를 가져오고,
                    *  PasswordEncoder를 이용해 비밀번호를 비교
                    *  인증에 성공하면 사용자 정보가 담긴 인증 완료된 Authentication 객체를 반환 */
                    authenticationManager.authenticate(
                            /* 1-1. 클라이언트가 보낸 ID와 비밀번호로 인증요청서(Authentication 객체)를 생성 */
                            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
                    );

            // 인증 성공 시 SecurityContext에 인증 정보 저장
            /* 인증 완료된 authentication 객체를 securityContext 객체에 담아 현재 요청을 처리하는 동안 인증 사실을 유지 */
            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(authentication);
            SecurityContextHolder.setContext(securityContext);

            // 세션에도 저장
            /* 인증 정보가 담긴 securityContext 객체를 HttpSession(서버의 보관함)에 저장
            *  서버(Tomcat)는 이 사용자를 위한 세션이 생성되었음을 인지
            *  서버는 이 세션을 식별하기 위한 고유 ID를 생성
            *  서버는 클라이언트에게 보내는 HTTP 응답 헤더에 Set-Cookie: 고유 ID를 포함 시켜 쿠키 저장을 명령
            *  클라이언트는 이 응답을 받고 앞으로 해당 웹사이트에 요청을 보낼 때마다 자동으로 해당 쿠키를 포함시켜 요청
            *  서버가 로그인에 성공한 사용자를 인식하고 그에 맞게 요청 처리 */
            session.setAttribute("SPRING_SECURITY_CONTEXT", securityContext);

            return ResponseEntity.ok().build(); // 인증 성공 시 200 OK
        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();  // 인증 실패 시 401 Unauthorized
        }
    }
}
