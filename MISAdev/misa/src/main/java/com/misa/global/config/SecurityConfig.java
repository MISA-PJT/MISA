package com.misa.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

// 로그인 페이지를 지정하고, 로그인 성공/실패 시의 동작을 정의

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CSRF 보호 비활성화 (API 서버는 보통 비활성화)
                // CSRF 공격 방어 기능을 비활성화
                // API 서버 환경에서는 보통 토큰 방식을 사용하므로 비활성화 하는 경우가 많음.
                .csrf(AbstractHttpConfigurer::disable)

                // Form 로그인 방식 비활성화
                .formLogin(AbstractHttpConfigurer::disable)

                // HTTP 기본 인증 비활성화
                .httpBasic(AbstractHttpConfigurer::disable)

                // 종료 시 로그아웃 추가
                .logout(logout -> logout
                        .logoutUrl("/logout")   // 로그아웃 엔드포인트
//                        .logoutRequestMatcher(new AntPathRequestMatcher("/logout", "POST"))
                        .logoutSuccessUrl("/") // 로그아웃 성공 후 리디렉트
                        .invalidateHttpSession(true)    // 세션 무효화
                        .deleteCookies("JSESSIONID")    // 쿠키 삭제 (세션 쿠키)
                        .permitAll()
                )
                .authorizeHttpRequests(authorize -> authorize
                        // 로그인 API, 게임 페이지, 정적 리소스는 인증 없이 허용
                        .requestMatchers("/api/characters/**", "/api/monsters/**", "/game/**", "/api/inventory/**").permitAll()
                        .requestMatchers("/", "/login/**","/index.html", "/favicon.ico", "/api/users/login","/css/**", "/js/**", "/images/**").permitAll()
                        .anyRequest().authenticated()   // 나머지 모든 요청은 인증 필요
                );
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // 비밀번호 암호화를 위한 인코더
    }
}
