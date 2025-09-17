package com.misa.equipment.dao;

import com.misa.item.dto.ItemDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CharacterEquipmentMapper {

    // 사용자 캐릭터 특정 장비 슬롯에 아이템 장착
    int equipItem(@Param("userId") String userId, @Param("slotCode") String slotCode, @Param("itemCode") String itemCode);

    // 사용자 캐릭터의 특정 장비 슬롯에 장착된 아이템 정보 조회
    ItemDTO findEquippedItemBySlot(@Param("userId") String userId, @Param("slotCode") String slotCode);

    // 사용자 캐릭터의 특정 장비 슬롯에서 아이템 해제
    int unequipItem(@Param("userId") String userId, @Param("slotCode") String slotCode);

    // 사용자 캐릭터의 장비 슬롯에 장착된 모든 아이템 정보 조회
    List<ItemDTO> findAllEquippedItemsByUserId(String userId);
}
