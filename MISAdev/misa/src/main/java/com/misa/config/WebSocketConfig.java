package com.misa.config;

import com.misa.handler.GameSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket    // WebSocket 서버 기능을 활성화 합니다.
public class WebSocketConfig implements WebSocketConfigurer {

    private final GameSocketHandler gameSocketHandler;

    // 생성자를 통해 핸들러 주입
    public WebSocketConfig(GameSocketHandler gameSocketHandler) {
        this.gameSocketHandler = gameSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // "/game" 주소로 오는 WebSocket 요청을 gameSocketHandler가 처리하도록 등록
        registry.addHandler(gameSocketHandler, "/game")
                .setAllowedOrigins("*");    // 모든 도메인에서의 접속을 허용
    }
}
