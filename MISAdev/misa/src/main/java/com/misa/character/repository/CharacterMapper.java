package com.misa.character.repository;

import com.misa.character.dto.CharacterDTO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CharacterMapper {

    // 사용자 ID를 기반으로 캐릭터 정보 조회
    CharacterDTO findCharacterById(String userId);
}
