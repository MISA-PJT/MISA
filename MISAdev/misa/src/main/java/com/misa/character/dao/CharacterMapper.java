package com.misa.character.dao;

import com.misa.character.dto.CharacterDTO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CharacterMapper {

    // 사용자 ID를 기반으로 캐릭터 정보 조회
    CharacterDTO findCharacterById(String userId);

    // 사용자 캐릭터의 상태를 업데이트
    int updateCharacterState(CharacterDTO character);
}
