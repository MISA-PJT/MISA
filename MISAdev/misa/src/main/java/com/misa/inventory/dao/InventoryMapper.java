package com.misa.inventory.dao;

import com.misa.inventory.dto.InventoryDTO;
import com.misa.inventory.dto.InventoryItemDetailDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface InventoryMapper {

    // 아이템 획득 시 인벤토리 업데이트
    int addItemOrUpdateQuantity(InventoryDTO inventoryDTO);

    // 사용자 캐릭터 인벤토리 조회
    List<InventoryItemDetailDTO> findInventoryByUserId(String userId);

    // 사용자 캐릭터의 인벤토리에서 특정 아이템의 수량을 조회
    Integer findItemQuantity(@Param("userId") String userId, @Param("itemCode") String itemCode);

    // 사용자의 인벤토리에서 아이템 수량을 감소 시킴.
    int decreaseItemQuantity(@Param("userId") String userId, @Param("itemCode") String itemCode, @Param("quantity") int quantity);

    // 사용자의 인벤토리에서 아이템을 제거
    int deleteItem(@Param("userId") String userId, @Param("itemCode") String itemCode);
}
