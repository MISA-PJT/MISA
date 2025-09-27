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
    // 접속 시 능력치 재계산 메소드에 true 전달 -250919 캐릭터 장비 장착 및 해제 시 HP 회복 제한
    public void addPlayer(String sessionId, String userId) {
        CharacterDTO baseCharacter = characterMapper.findCharacterById(userId);
        if (baseCharacter != null) {
            CharacterDTO liveCharacter = new CharacterDTO(baseCharacter);
            livePlayers.put(userId, liveCharacter);
            recalculatePlayerStats(userId, true); // 접속 시 능력치 한번 재계산
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
    public void recalculatePlayerStats(String userId, boolean isInitialLoad) {
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
            int oldMaxHp = livePlayer.getCharacterHp();
            int newMaxHp = baseStats.getCharacterHp() + totalHpBonus;

            livePlayer.setCharacterHp(newMaxHp);
            livePlayer.setCharacterAp(baseStats.getCharacterAp() + totalApBonus);
            livePlayer.setCharacterDp(baseStats.getCharacterDp() + totalDpBonus);

            // DB에 저장된 현재 HP 가 있다면 그 값을 사용 -250923 사용자 정보 불러오기
            // 최초 접속 시에만 현재 HP를 최대 HP로 설정
            if (isInitialLoad) {
                Integer savedHp = baseStats.getCurrentHp();

                if (savedHp != null && savedHp > 0) {
                    livePlayer.setCurrentHp(savedHp);
                } else {
                    livePlayer.setCurrentHp(newMaxHp);
                }
            } else {
                // 게임 중에는 현재 HP가 새로운 최대 HP를 넘지 않도록 보정
                if (livePlayer.getCurrentHp() > newMaxHp) {
                    livePlayer.setCurrentHp(newMaxHp);
                }
            }

            System.out.println("능력치 적용 완료 : " + livePlayer);

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

                            // 경험치 부여 및 레벨업 체크 메소드 호출
                            grantExpAndCheckLevelUp(attackerId, originalMonster.getMonsterExp());

                            // 몬스터 리스폰 로직
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

                // 사용자 캐릭터 사망 로직 -250919
                // 모든 클라이언트에게 사용자 사망 정보 브로드캐스팅
                broadcastPlayerState(userId, "PLAYER_DIED");

                // 5초 후에 부활 로직 실행 예약
                respawnScheduler.schedule(() -> {
                    // HP를 최대로 회복
                    livePlayer.setCurrentHp(livePlayer.getCharacterHp());

                    // 모든 클라이언트에게 사용자 부활 정보 브로드캐스팅
                    broadcastPlayerState(userId, "PLAYER_RESPAWN");

                    System.out.println("사용자 " + userId + " 부활");
                }, 5, TimeUnit.SECONDS);
            }
        }

        recalculatePlayerStats(userId, false);
    }

    // 사용자 상태 브로드캐스팅 메소드
    public void broadcastPlayerState(String userId, String type) {
        CharacterDTO livePlayer = getLivePlayer(userId);
        if (livePlayer == null) return;

        Map<String, Object> message = new ConcurrentHashMap<>();
        message.put("type", type);
        message.put("userId", userId);
        message.put("lat", 37.563188);
        message.put("lng", 127.192642);

        if ("PLAYER_RESPAWN".equals(type)) {
            message.put("currentHp", livePlayer.getCurrentHp());
            message.put("maxHp", livePlayer.getCharacterHp());
        }

        String messageJson;
        try {
            messageJson = objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            return;
        }

        sessions.values().forEach(s -> {
            try {
                s.sendMessage(new TextMessage(messageJson));
            } catch (Exception e) {
                System.out.println("s.sendMessage 실패");
            }
        });
    }

    // 경험치 부여 및 레벨업 처리 메소드 추가 -250928
    public void grantExpAndCheckLevelUp(String userId, int monsterExp) {
        CharacterDTO livePlayer = getLivePlayer(userId);
        if (livePlayer == null) return;

        livePlayer.setCharacterExp(livePlayer.getCharacterExp() + monsterExp);
        System.out.println(userId + " 님이 경험치 " + monsterExp + "획득!");

        // 레벨업에 필요한 경험치 설정
        int requiredExp = livePlayer.getCharacterLevel() * 200;

        // 레벨업 체크 (경험치가 충분하면 레벨업)
        if (livePlayer.getCharacterExp() >= requiredExp) {

            // DB 에서 현재 캐릭터의 순수 기본 능력치를 추출
            CharacterDTO baseStats = characterMapper.findCharacterById(userId);

            // 새로운 레벨과 남은 경험치 계산
            int newLevel = baseStats.getCharacterLevel() + 1;
            int remainingExp = livePlayer.getCharacterExp() - requiredExp;

            // DB 업데이트용 DTO 설정
            baseStats.setCharacterLevel(newLevel);
            baseStats.setCharacterExp(remainingExp);

            // 순수 기본 능력치에 레벨업 보너스를 더함.
            baseStats.setCharacterHp(baseStats.getCharacterHp() + 10);
            baseStats.setCharacterAp(baseStats.getCharacterAp() + 1);
            baseStats.setCharacterDp(baseStats.getCharacterDp() + 1);
            characterMapper.updateCharacterBaseStats(baseStats);

            // 실시간 사용자 객체도 갱신
            livePlayer.setCharacterLevel(newLevel);
            livePlayer.setCharacterExp(remainingExp);

            System.out.println("레벨업! " + userId + " 님이 " + newLevel + " 레벨이 되었습니다.");

            // 변경된 기본 능력치를 DB에 저장
        } else {
            // 레벨업 하지 않았다면, 현재 경험치만 DB에 저장
            characterMapper.updateCharacterExp(userId, livePlayer.getCharacterExp());
        }

        // 변경된 모든 스탯(장비 포함)을 클라이언트에 전송
        recalculatePlayerStats(userId, false);
    }
}
