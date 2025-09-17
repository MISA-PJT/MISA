package com.misa.item.dao;

import com.misa.item.dto.ItemDTO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ItemMapper {
    ItemDTO findItemByCode(String itemCode);
}
