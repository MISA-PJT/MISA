package com.misa.inventory.service;

import com.misa.inventory.dto.InventoryDTO;
import com.misa.inventory.repository.InventoryMapper;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {

    private final InventoryMapper inventoryMapper;

    public InventoryService(InventoryMapper inventoryMapper) {
        this.inventoryMapper = inventoryMapper;
    }

    public void addItemToInventory(String userId, String itemCode, int quantity) {
        InventoryDTO newItem = new InventoryDTO(userId, itemCode, quantity);

        int result = inventoryMapper.addItemOrUpdateQuantity(newItem);

        if (result > 0) {
            System.out.println("인벤토리 업데이트 성공 : User '" + userId + "' gets '" + itemCode + "' x" + quantity);
        } else {
            System.out.println("인벤토리 업데이트 실패 : User '" + userId + "', Item '" + itemCode + "'");
        }
    }
}
