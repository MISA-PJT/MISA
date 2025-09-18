package com.misa.monster.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.misa.character.dao.CharacterMapper;
import com.misa.character.dto.CharacterDTO;
import com.misa.equipment.dao.CharacterEquipmentMapper;
import com.misa.inventory.service.InventoryService;
import com.misa.item.dto.ItemDTO;
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
    private final InventoryService inventoryService;    // InventoryService 주입

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

    // 캐릭터 기본 정보 조회
    private final CharacterMapper characterMapper;

    // 장착 장비 조회
    private final CharacterEquipmentMapper equipmentMapper;

    private final Map<String, CharacterDTO> livePlayers = new ConcurrentHashMap<>();

    public GameService(MonsterService monsterService,
                       InventoryService inventoryService,
                       ObjectMapper objectMapper,
                       CharacterMapper characterMapper,
                       CharacterEquipmentMapper equipmentMapper) {
        this.monsterService = monsterService;
        this.inventoryService= inventoryService;
        this.objectMapper = objectMapper;
        this.characterMapper = characterMapper;
        this.equipmentMapper = equipmentMapper;
    }

    // GameSocketHandler 에서 sessions 공유를 위한 setter 메소드 (동기화 위해 putAll 사용)
    public void setSessions(Map<String, WebSocketSession> newSessions) {
        this.sessions.clear();
        this.sessions.putAll(newSessions);
        System.out.println("Sessions 업데이트됨. 총 세션 수 : " + this.sessions.size());
    }

    // 사용자 접속 메소드
    public void addPlayer(String sessionId, String userId) {
        CharacterDTO baseCharacter = characterMapper.findCharacterById(userId);
        if (baseCharacter != null) {
            CharacterDTO liveCharacter = new CharacterDTO(baseCharacter);
            livePlayers.put(userId, liveCharacter);
            recalculatePlayerStats(userId); // 접속 시 능력치 한번 재계산
        }
    }

    // 사용자 접속 종료 메소드
    public void removePlayer(String userId) {
        livePlayers.remove(userId);
    }

    // 실시간 사용자 정보 확인
    public CharacterDTO getLivePlayer(String userId) {
        return livePlayers.get(userId);
    }

    // 사용자의 능력치를 재계산하고 모든 클라이언트에게 업데이트된 정보 전송
    public void recalculatePlayerStats(String userId) {
        // DB 에서 사용자 캐릭터의 기본 능력치 적용
        CharacterDTO baseStats = characterMapper.findCharacterById(userId);
        if (baseStats == null) return;;

        // 현재 장착 중인 모든 장비 아이템 목록 조회
        List<ItemDTO> equippedItems = equipmentMapper.findAllEquippedItemsByUserId(userId);

        // 장착 중인 장비 아이템들의 능력치 적용
        int totalHpBonus = equippedItems.stream().mapToInt(ItemDTO::getItemHp).sum();
        int totalApBonus = equippedItems.stream().mapToInt(ItemDTO::getItemAp).sum();
        int totalDpBonus = equippedItems.stream().mapToInt(ItemDTO::getItemDp).sum();

        // 실시간 사용자 캐릭터에 최종 능력치(기본 + 장비)를 업데이트
        CharacterDTO livePlayer = livePlayers.get(userId);
        if (livePlayer != null) {

            // 현재 HP를 보존하고, 최대 HP를 초과하지 않도록 처리
            int oldMaxHp = livePlayer.getCharacterHp(); // 변경전 최대 HP
            int newMaxHp = baseStats.getCharacterHp() + totalHpBonus;

            livePlayer.setCharacterHp(newMaxHp);
            livePlayer.setCharacterAp(baseStats.getCharacterAp() + totalApBonus);
            livePlayer.setCharacterDp(baseStats.getCharacterDp() + totalDpBonus);

            // 최대 HP가 변경되었다면, 현재 HP도 비율에 맞게 조정 후 최대치를 넘지 않도록 제한
            if (livePlayer.getCharacterHp() > newMaxHp) {
                livePlayer.setCurrentHp(newMaxHp);
            }

            System.out.println("능력치 적용 완료 : " + livePlayer);

            // TODO: 변경된 능력치 정보를 해당 클라이언트에게 WebSocket 으로 전송
            // 해당 사용자의 WebSocket 세션을 조회
            WebSocketSession session = sessions.values().stream()
                    .filter(s -> userId.equals(s.getAttributes().get("userId")))
                    .findFirst()
                    .orElse(null);

            if (session != null && session.isOpen()) {
                try {
                    // 클라이언트에게 보낼 메시지 생성
                    Map<String, Object> statUpdateMsg = new ConcurrentHashMap<>();
                    statUpdateMsg.put("type", "PLAYER_STAT_UPDATE");
                    statUpdateMsg.put("hp", livePlayer.getCharacterHp());
                    statUpdateMsg.put("ap", livePlayer.getCharacterAp());
                    statUpdateMsg.put("dp", livePlayer.getCharacterDp());
                    statUpdateMsg.put("currentHp", livePlayer.getCurrentHp());

                    // JSON 으로 변환하여 메시지 전송
                    String messageJson = objectMapper.writeValueAsString(statUpdateMsg);
                    session.sendMessage(new TextMessage(messageJson));
                    System.out.println(userId + " 에게 능력치 업데이트 정보 전송 완료.");
                } catch (Exception e) {
                    System.err.println(userId + "에게 능력치 정보 전송 실패 : " + e.getMessage());
                }
            }
        }
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

        CharacterDTO attacker = livePlayers.get(attackerId);
        if (attacker == null) {
            System.err.println("공격자를 livePlayers 에서 찾을 수 없음 : " + attackerId);
            return new ConcurrentHashMap<>();
        }
        int playerAp = attacker.getCharacterAp();

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

                                // 드랍된 각 아이템을 플레이어의 인벤토리에 추가
                                droppedItems.forEach(item -> {
                                    String playerId = "misa01";
                                    inventoryService.addItemToInventory(playerId, item.getItemCode(), 1);
                                });
                            }
                        }
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

    // 몬스터의 사용자 캐릭터 공격 로직
    public void processMonsterAttack(String userId, int monsterSpawnId) {
        CharacterDTO livePlayer = getLivePlayer(userId);
        MonsterDTO attackingMonster = liveMonsters.get(monsterSpawnId); // 사용자를 공격하는 몬스터 조회

        if (livePlayer == null || attackingMonster == null ||livePlayer.getCharacterHp() <= 0) {
            return; // 사용자나 몬스터가 없거나 사용자 사망 시 무시
        }

        int monsterAp = attackingMonster.getAp();

        synchronized (livePlayer) {
            int damage = Math.max(1, monsterAp - livePlayer.getCharacterDp());
            livePlayer.setCurrentHp(livePlayer.getCurrentHp() - damage);

            if (livePlayer.getCurrentHp() <= 0) {
                livePlayer.setCurrentHp(0);
                System.out.println("사용자 " + userId + " 처치됨.");
            }
        }

        recalculatePlayerStats(userId);
    }
}
