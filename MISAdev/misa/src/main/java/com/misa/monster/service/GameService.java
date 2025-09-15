package com.misa.monster.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.misa.monster.dto.MonsterDTO;
import com.misa.monster.dto.MonsterDropDTO;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class GameService {

    private final MonsterService monsterService;

    // sessions 맵 (GameSocketHandler와 공유 - 브로드캐스트용)
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    // 게임 월드에 존재하는 모든 몬스터의 원본 상태를 저장
    private final Map<Integer, MonsterDTO> monsterPrototypes = new ConcurrentHashMap<>();

    // 게임 월드에 존재하는 모든 몬스터의 실시간 상태를 저장
    private final Map<Integer, MonsterDTO> liveMonsters = new ConcurrentHashMap<>();

    // 리스폰 스케줄러 (공유 타이머 풀)
    private final ScheduledExecutorService respawnScheduler = Executors.newScheduledThreadPool(10);

    // 각 몬스터별 리스폰 Future 저장 (중복 방지)
    private final Map<Integer, java.util.concurrent.ScheduledFuture<?>> respawnFutures = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public GameService(MonsterService monsterService, ObjectMapper objectMapper) {
        this.monsterService = monsterService;
        this.objectMapper = objectMapper;
    }

    // GameSocketHandler 에서 sessions 공유를 위한 setter 메소드 (동기화 위해 putAll 사용)
    public void setSessions(Map<String, WebSocketSession> newSessions) {
        this.sessions.clear();
        this.sessions.putAll(newSessions);
        System.out.println("Sessions 업데이트됨. 총 세션 수 : " + this.sessions.size());
    }

    @PostConstruct  // GameService 빈(Bean)이 생성된 후 자동으로 실행
    public void init() {
        // DB 에서 모든 몬스터의 원본 데이터를 불러와 liveMonsters 맵에 저장
        monsterService.findAllMonsters().forEach(monster -> {
            monsterPrototypes.put(monster.getSpawnId(), monster);
            liveMonsters.put(monster.getSpawnId(), new MonsterDTO(monster));
        });
        System.out.println("Prototypes loaded : " + monsterPrototypes.size());
        System.out.println("Live-Monsters loaded: " + liveMonsters.size());
    }

    // 리스폰 브로드캐스트 메소드
    public void broadcastRespawn(int spawnId, int newHp) {
        Map<String, Object> respawnMsg = new ConcurrentHashMap<>();
        respawnMsg.put("type", "MONSTER_RESPAWN");
        respawnMsg.put("monsterSpawnId", spawnId);
        respawnMsg.put("newHp", newHp);

        String resultJson;
        try {
            resultJson = objectMapper.writeValueAsString(respawnMsg);
        } catch (Exception e) {
            System.err.println("Respawn JSON 직렬화 실패 : " + e.getMessage());
            return;
        }

        // 브로드캐스트
        sessions.values().stream()
                .filter(WebSocketSession::isOpen)
                .forEach(s -> {
                    try {
                        s.sendMessage(new TextMessage(resultJson));
                        System.out.println("리스폰 브로드캐스트 성공 : " + s.getId());
                    } catch (Exception e) {
                        System.err.println("리스폰 브로드캐스트 실패 for " + s.getId() + " : " + e.getMessage());
                    }
                });
    }

    // 리스폰 메소드
    public void scheduleRespawn(int spawnId, MonsterDTO originalMonster) {
        // 기존 타이머 취소 (중복 리스폰 방지)
        respawnFutures.computeIfPresent(spawnId, (key, oldFuture) -> {
            oldFuture.cancel(false);
            return null;
        });

        // 새 타이머 시작 (10초 후)
        java.util.concurrent.ScheduledFuture<?> future = respawnScheduler.schedule(() -> {
            synchronized (liveMonsters.get(spawnId)) {
                MonsterDTO monster = liveMonsters.get(spawnId);
                if (monster != null) {
                    monster.setHp(originalMonster.getHp());
                    monster.setState("idle");
                    monster.setLatitude(originalMonster.getLatitude());
                    monster.setLongitude(originalMonster.getLongitude());
                    System.out.println("몬스터 " + spawnId + " 리스폰됨. HP : " + monster.getHp());
                }
            }
            // Future 제거
            respawnFutures.remove(spawnId);

            // 리스폰 후 브로드캐스트 (클라이언트 동기화)
            MonsterDTO monster = liveMonsters.get(spawnId);
            if (monster != null) {
                broadcastRespawn(spawnId, monster.getHp());
            }
        }, 10, TimeUnit.SECONDS);   // 10초 지연

        respawnFutures.put(spawnId, future);
        System.out.println("몬스터 " + spawnId + " 리스폰 타이머 시작됨.");
    }

    // 사용자의 공격을 처리하는 메소드
    public Map<String, Object> processAttack(String attackerId, int targetSpawnId) {
        int playerAp = 5;

        Map<String, Object> result = new ConcurrentHashMap<>();
        MonsterDTO targetMonster = liveMonsters.get(targetSpawnId);

        if (targetMonster != null) {

            // synchronized 블록으로 특정 몬스터 객체에 대한 동시 접근을 제어
            synchronized (targetMonster) {
                if (targetMonster.getHp() > 0) {
                    int damage = Math.max(1, playerAp - targetMonster.getDp());
                    targetMonster.setHp(targetMonster.getHp() - damage);

                    result.put("type", "ATTACK_RESULT");
                    result.put("monsterSpawnId", targetSpawnId);
                    result.put("damage", damage);
                    result.put("newHp", targetMonster.getHp());

                    if (targetMonster.getHp() <= 0) {
                        System.out.println("몬스터 " + targetSpawnId + " 처치됨.");

                        // DB 조회 대신, 메모리에 있는 원본 몬스터 데이터 사용
                        MonsterDTO originalMonster = monsterPrototypes.get(targetSpawnId);
                        if (originalMonster != null) {
                            scheduleRespawn(targetSpawnId, originalMonster);

                            // 몬스터 아이템 드랍 로직 -250915
                            List<MonsterDropDTO> droppedItems = new ArrayList<>();
                            // 몬스터 드랍 테이블을 순회하며 확률 계산
                            if (originalMonster.getDropList() != null) {
                                originalMonster.getDropList().forEach(dropInfo -> {
                                    if (Math.random() * 100 < dropInfo.getDropRate()) {
                                        droppedItems.add(dropInfo);
                                    }
                                });
                            }
                            // 드랍된 아이템이 있으면 결과 맵에 추가
                            if (!droppedItems.isEmpty()) {
                                result.put("droppedItems", droppedItems);
                            }
                        }
                        // 리스폰 스케줄링 (원본 데이터로 복구)
//                        MonsterDTO original = monsterService.findBySpawnId(targetSpawnId);
//                        scheduleRespawn(targetSpawnId, original);
                    }
                } else {
                    System.out.println("Target monster already dead : " + targetSpawnId);
                }
            }
        } else {
            System.out.println("Invalid target : " + targetSpawnId);
        }
        return result;
    }

    // Handler 에서 브로드캐스트 시 사용할 getter 메소드
    public Map<String, WebSocketSession> getSessions() {
        return sessions;
    }

}
