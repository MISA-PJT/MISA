package com.misa.inventory.service;

import com.misa.character.dto.CharacterDTO;
import com.misa.inventory.dto.InventoryDTO;
import com.misa.inventory.dto.InventoryItemDetailDTO;
import com.misa.inventory.dao.InventoryMapper;
import com.misa.item.dao.ItemMapper;
import com.misa.item.dto.ItemDTO;
import com.misa.monster.service.GameService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InventoryService {

    private final InventoryMapper inventoryMapper;
    private final GameService gameService;
    private final ItemMapper itemMapper;

    public InventoryService(InventoryMapper inventoryMapper,
                            @Lazy GameService gameService,  // GameService 와 InventoryService 순환 참조 방지
                            ItemMapper itemMapper) {
        this.inventoryMapper = inventoryMapper;
        this.gameService = gameService;
        this.itemMapper = itemMapper;
    }

    // 사용자 캐릭터 아이템 획득 시 인벤토리 업데이트
    public void addItemToInventory(String userId, String itemCode, int quantity) {
        InventoryDTO newItem = new InventoryDTO(userId, itemCode, quantity);

        int result = inventoryMapper.addItemOrUpdateQuantity(newItem);

        if (result > 0) {
            System.out.println("인벤토리 업데이트 성공 : User '" + userId + "' gets '" + itemCode + "' x" + quantity);
        } else {
            System.out.println("인벤토리 업데이트 실패 : User '" + userId + "', Item '" + itemCode + "'");
        }
    }

    // 사용자 캐릭터 인벤토리 조회
    public List<InventoryItemDetailDTO> findInventoryByUserId(String userId) {
        return inventoryMapper.findInventoryByUserId(userId);
    }

    // 사용자 캐릭터 인벤토리 아이템 추가
    @Transactional
    public void addItem(String userId, String itemCode, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("수량은 1 이상이어야 합니다.");
        }
        int result = inventoryMapper.addItemOrUpdateQuantity(new InventoryDTO(userId, itemCode, quantity));
        if (result == 0) {
            throw new RuntimeException("인벤토리 추가 실패 : userID : " + userId + ", itemCode : " + itemCode);
        }
        System.out.println("인벤토리 추가 성공 : " + userId + " <- " + itemCode + " x " + quantity);
    }

    @Transactional
    public void removeItem(String userId, String itemCode, int quantity) {
        Integer currentQuantity = inventoryMapper.findItemQuantity(userId, itemCode);
        if (currentQuantity == null || currentQuantity < quantity) {
            throw new RuntimeException("인벤토리에 아이템이 없거나 수량이 부족합니다.");
        }
        if (currentQuantity > quantity) {
            inventoryMapper.decreaseItemQuantity(userId, itemCode, quantity);
        } else {
            inventoryMapper.deleteItem(userId, itemCode);
        }
    }

    public Integer getItemQuantity(String userId, String itemCode) {
        return inventoryMapper.findItemQuantity(userId, itemCode);
    }

    @Transactional
    public void useItem(String userId, String itemCode) {
        // 사용할 아이템 정보 조회
        ItemDTO itemToUse = itemMapper.findItemByCode(itemCode);
        if (itemToUse == null || !"consumable".equals(itemToUse.getItemType())) {
            throw new RuntimeException("사용할 수 없는 아이템 입니다.");
        }

        // GameService 에서 실시간 사용자 정보 가져오기
        CharacterDTO livePlayer = gameService.getLivePlayer(userId);
        if (livePlayer == null) {
            throw new RuntimeException("사용자 정보를 찾을 수 없습니다.");
        }

        // HP 회복 로직
        int healAmount = itemToUse.getItemHp();
        int maxHp = livePlayer.getCharacterHp();
        int currentHp = livePlayer.getCurrentHp();

        // 최대 HP 초과 방지
        int newHp = Math.min(maxHp, currentHp + healAmount);
        livePlayer.setCurrentHp(newHp);

        System.out.println(userId + " 님이 " + itemToUse.getItemName() + "을(를) 사용. HP " + (newHp - currentHp) + " 회복");

        // 사용한 아이템 인벤토리에서 제거(수량 1)
        removeItem(userId, itemCode, 1);

        // 변경된 능력치 정보 클라이언트에 전송
        gameService.recalculatePlayerStats(userId);

    }
}
