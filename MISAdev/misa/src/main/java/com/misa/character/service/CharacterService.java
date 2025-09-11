package com.misa.character.service;

import com.misa.character.dto.CharacterDTO;
import com.misa.character.repository.CharacterMapper;
import org.springframework.stereotype.Service;

@Service
public class CharacterService {

    private final CharacterMapper characterMapper;

    public CharacterService(CharacterMapper characterMapper) {
        this.characterMapper = characterMapper;
    }

    // ID로 캐릭터 정보를 조회하고, 실시간 데이터 초기화
    public CharacterDTO findCharacterById(String userId) {

        // DB 에서 캐릭터의 기본 데이터 조회
        CharacterDTO character = characterMapper.findCharacterById(userId);

        // 조회된 데이터가 있다면, 실시간 데이터 초기화
        if (character != null) {
            // 현재 HP를 최대 HP와 동일하게 설정
            character.setCurrentHp(character.getCharacterHp());

        }

        return character;
    }
}
