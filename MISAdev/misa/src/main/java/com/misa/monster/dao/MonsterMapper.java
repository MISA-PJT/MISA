package com.misa.monster.dao;

import com.misa.monster.dto.MonsterDTO;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface MonsterMapper {

    // 게임에 존재하는 모든 몬스터의 스폰 정보를 조회
    List<MonsterDTO> findAllMonsters();
}
