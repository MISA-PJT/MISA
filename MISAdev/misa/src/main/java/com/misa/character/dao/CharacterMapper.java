package com.misa.character.dao;

import com.misa.character.dto.CharacterDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CharacterMapper {

    // 사용자 ID를 기반으로 캐릭터 정보 조회
    CharacterDTO findCharacterById(String userId);

    // 사용자 캐릭터의 상태를 업데이트
    int updateCharacterState(CharacterDTO character);

    // 레벨업 시 사용자 캐릭터의 기본 능력치 및 레벨 경험치 업데이트
    int updateCharacterBaseStats(CharacterDTO character);

    // 캐릭터의 경험치만 업데이트
    int updateCharacterExp(@Param("userId") String userId, @Param("characterExp") int exp);
}
