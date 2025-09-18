package com.misa.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.misa.monster.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameSocketHandler extends TextWebSocketHandler {

    // 연결/종료 관리용 sessions 맵
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();   // JSON <-> Java Object 변환기
    private final GameService gameService;

    @Autowired
    public GameSocketHandler(GameService gameService) {
        this.gameService = gameService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {

        // 세션 추가 후 전체 맵 공유
        sessions.put(session.getId(), session);
        gameService.setSessions(sessions);

        System.out.println("클라이언트 접속 : " + session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {

        try {
            // 클라이언트로부터 메시지를 받으면 호출
            String payload = message.getPayload();
            System.out.println("메시지 수신 : " + payload);

            Map<String, Object> messageMap = objectMapper.readValue(payload, Map.class);
            String messageType = (String) messageMap.get("type");

            String userId;
            Object spawnIdObj;

            switch (messageType) {

                case "ENTER":
                    userId = (String) messageMap.get("userId");
                    // 세션의 속성(attributes)에 userId를 저장
                    session.getAttributes().put("userId", userId);
                    // GameService에 사용자 추가
                    gameService.addPlayer(session.getId(), userId);
                    break;

                case "PLAYER_ATTACK":

                    userId = (String) session.getAttributes().get("userId");
                    if (userId == null) {
                        System.err.println("인증되지 않은 세션의 공격 요청 입니다.");
                        return;
                    }

                    spawnIdObj = messageMap.get("targetMonsterSpawnId");
                    int targetSpawnId;
                    if (spawnIdObj instanceof String) {
                        targetSpawnId = Integer.parseInt((String) spawnIdObj);
                    } else if (spawnIdObj instanceof Integer) {
                        targetSpawnId = (Integer) spawnIdObj;
                    } else {
                        throw new IllegalArgumentException("Invalid targetMonsterSpawnId type : " + spawnIdObj.getClass());
                    }

                    // GameService에 로직 처리를 위임하고 결과를 받음.
                    Map<String, Object> attackResult = gameService.processAttack(userId, targetSpawnId);

                    // 모든 사용자에게 공격 결과 브로드캐스팅
                    if (!attackResult.isEmpty()) {
                        String resultJson = objectMapper.writeValueAsString(attackResult);
                        gameService.getSessions().values().stream()
                                .filter(WebSocketSession::isOpen)
                                .forEach(s -> {
                            try {
                                s.sendMessage(new TextMessage(resultJson));
                                System.out.println("브로드캐스트 성공 : " + s.getId());
                            } catch (Exception e) {
                                System.err.println("Broadcast failed for session " + s.getId() + " : " + e.getMessage());
                            }
                        });
                    }
                    break;

                case "MONSTER_ATTACK":
                    userId = (String) session.getAttributes().get("userId");
                    spawnIdObj = messageMap.get("monsterSpawnId");

                    if (userId != null && spawnIdObj != null) {
                        int monsterSpawnId = (Integer) spawnIdObj;
                        gameService.processMonsterAttack(userId, monsterSpawnId);
                    }
                    break;

                default:
                    System.out.println("Unknown message type : " + messageType);
            }
        } catch (Exception e) {
            System.err.println("handleTextMessage 예외 발생 : " + e.getMessage());
            e.printStackTrace();
            if (session.isOpen()) {
                try {
                    String errorMsg = e.getMessage().replace("\"", "\\\"");
                    session.sendMessage(new TextMessage("{\"type\":\"ERROR\",\"message\":\"" + errorMsg + "\"}"));
                } catch (Exception sendErr) {
                    System.err.println("에러 메시지 전송 실패 : " + sendErr.getMessage());
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        // 클라이언트 접속이 끊기면 세션 저장소에서 제거
        sessions.remove(session.getId());
        gameService.setSessions(sessions);  // 업데이트된 맵 공유
        System.out.println("클라이언트 접속 해제 : " + session.getId());
    }
}
