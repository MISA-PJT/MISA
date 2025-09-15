package com.misa.inventory.repository;

import com.misa.inventory.dto.InventoryDTO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface InventoryMapper {

    int addItemOrUpdateQuantity(InventoryDTO inventoryDTO);
}
