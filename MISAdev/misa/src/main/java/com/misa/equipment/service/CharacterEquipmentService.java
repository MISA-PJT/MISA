package com.misa.equipment.service;

import com.misa.equipment.dao.CharacterEquipmentMapper;
import com.misa.inventory.service.InventoryService;
import com.misa.item.dto.ItemDTO;
import com.misa.item.dao.ItemMapper;
import com.misa.monster.service.GameService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CharacterEquipmentService {

    private final CharacterEquipmentMapper equipmentMapper;
    private final InventoryService inventoryService;
    private final ItemMapper itemMapper;
    private final GameService gameService;

    public CharacterEquipmentService(CharacterEquipmentMapper equipmentMapper,
                                     InventoryService inventoryService,
                                     ItemMapper itemMapper,
                                     GameService gameService) {
        this.equipmentMapper = equipmentMapper;
        this.inventoryService = inventoryService;
        this.itemMapper = itemMapper;
        this.gameService = gameService;
    }

    // 모든 DB 작업을 하나의 트랜잭션으로 처리
    // 여러 테이블의 데이터를 변경하므로, 중간에 오류가 발생했을 때 모든 작업을 되돌리기 위해 @Transactional 사용
    @Transactional
    public void equipItem(String userId, String itemCode) {
        System.out.println(userId + " 님이 " + itemCode + " 아이템 장착을 시도합니다.");

        // 아이템 정보 조회
        ItemDTO newItem = itemMapper.findItemByCode(itemCode);
        System.out.println("새 아이템 슬롯 코드 : " + newItem.getSlotCode());
        if (newItem == null || !"equipment".equals(newItem.getItemType())) {
            throw new RuntimeException("장착할 수 없는 아이템입니다.");
        }

        // 사용자 인벤토리에 해당 아이템이 있는지 확인
        Integer currentQuantity = inventoryService.getItemQuantity(userId, itemCode);
        if (currentQuantity == null || currentQuantity < 1) {
            throw new RuntimeException("인벤토리에 장착할 아이템이 없습니다.");
        }

        // 장착할 부위에 이미 다른 아이템이 있는지 확인
        ItemDTO oldItem = equipmentMapper.findEquippedItemBySlot(userId, newItem.getSlotCode());

        // 기존에 장착된 아이템이 있다면, 인벤토리로 회수
        if (oldItem != null) {
            System.out.println("기존 아이템 발견 : " + oldItem.getItemCode() + " (" + oldItem.getItemName() + ")");
            inventoryService.addItem(userId, oldItem.getItemCode(), 1);
            System.out.println("장착 해제 아이템 " + oldItem.getItemCode() + " 을(를) 인벤토리로 옮겼습니다.");
        } else {
            System.out.println("기존 아이템 없음 : 슬롯 " + newItem.getSlotCode() + " 비어 있음.");
        }

        // 반환값 체크 및 디버깅(oldItem == null)
        int equipResult = equipmentMapper.equipItem(userId, newItem.getSlotCode(), newItem.getItemCode());
        if (equipResult == 0) {
            throw new RuntimeException("아이템 장착 실패 : affected rows=0 (FK violation 가능)");
        }
        System.out.println("장착 성공 : affected rows=" + equipResult);

        // 아이템 장착 (insert or update)
        equipmentMapper.equipItem(userId, newItem.getSlotCode(), newItem.getItemCode());
        System.out.println(userId + " 님이 " + newItem.getSlotCode() + " 부위에 " + newItem.getItemCode() + " 아이템을 장착했습니다.");

        // 인벤토리에서 아이템 제거 혹은 수량 1 감소
        System.out.println("인벤토리에서 " + itemCode + " 제거 시도.");
        inventoryService.removeItem(userId, itemCode, 1);
        System.out.println("인벤토리 제거 완료.");

        // GameService에 능력치 재계산 요청
        gameService.recalculatePlayerStats(userId, false);

    }

    @Transactional
    public void unequipItem(String userId, String slotCode) {

        // 해제할 아이템 정보 조회
        ItemDTO itemToUnequip = equipmentMapper.findEquippedItemBySlot(userId, slotCode);

        if (itemToUnequip == null) {
            throw new RuntimeException("해당 부위에 장착된 아이템이 없습니다.");
        }

        // 장비창에서 아이템 제거
        int result = equipmentMapper.unequipItem(userId, slotCode);
        if (result == 0) {
            throw new RuntimeException("아이템 장착 해제에 실패했습니다.");
        }

        // 인벤토리에 아이템 추가
        inventoryService.addItem(userId, itemToUnequip.getItemCode(), 1);

        System.out.println(userId + " 님이 " + slotCode + " 부위의 " + itemToUnequip.getItemCode() + " 아이템을 해제했습니다.");

        // GameService에 능력치 재계산 요청
        gameService.recalculatePlayerStats(userId, false);

    }
}
