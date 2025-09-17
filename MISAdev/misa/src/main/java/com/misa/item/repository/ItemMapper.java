package com.misa.item.repository;

import com.misa.item.dto.ItemDTO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ItemMapper {
    ItemDTO findItemByCode(String itemCode);
}
