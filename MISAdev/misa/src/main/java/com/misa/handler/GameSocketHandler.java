package com.misa.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameSocketHandler extends TextWebSocketHandler {

    // 접속한 클라이언트(사용자)들을 관리하기 위한 세션 저장소
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();   // JSON <-> Java Object 변환기

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // 클라이언트가 접속하면 세션 저장소에 추가
        sessions.put(session.getId(), session);
        System.out.println("클라이언트 접속 : " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // 클라이언트로부터 메시지를 받으면 호출
        String payload = message.getPayload();
        System.out.println("메시지 수신 : " + payload);

        // TODO: 메시지 종류에 따라 로직 처리 (예: 플레이어 이동, 공격)
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        // 클라이언트 접속이 끊기면 세션 저장소에서 제거
        sessions.remove(session.getId());
        System.out.println("클라이언트 접속 해제 : " + session.getId());
    }
}
