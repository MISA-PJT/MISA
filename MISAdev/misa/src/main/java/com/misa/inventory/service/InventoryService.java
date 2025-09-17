package com.misa.inventory.service;

import com.misa.inventory.dto.InventoryDTO;
import com.misa.inventory.dto.InventoryItemDetailDTO;
import com.misa.inventory.repository.InventoryMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InventoryService {

    private final InventoryMapper inventoryMapper;

    public InventoryService(InventoryMapper inventoryMapper) {
        this.inventoryMapper = inventoryMapper;
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
}
