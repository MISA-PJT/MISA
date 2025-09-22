package com.misa.character.service;

import com.misa.character.dto.CharacterDTO;
import com.misa.character.dao.CharacterMapper;
import com.misa.character.dto.CharacterStatusDTO;
import com.misa.equipment.dao.CharacterEquipmentMapper;
import com.misa.item.dto.ItemDTO;
import com.misa.monster.service.GameService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CharacterService {

    private final CharacterMapper characterMapper;
    private final GameService gameService;
    private final CharacterEquipmentMapper equipmentMapper;

    public CharacterService(CharacterMapper characterMapper,
                            GameService gameService,
                            CharacterEquipmentMapper equipmentMapper) {
        this.characterMapper = characterMapper;
        this.gameService = gameService;
        this.equipmentMapper = equipmentMapper;
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

    // 캐릭터 정보 종합 조회 메소드
    public CharacterStatusDTO getCharacterStatus(String userId) {
        CharacterDTO livePlayer = gameService.getLivePlayer(userId);
        if (livePlayer == null) {
            return null;
        }

        List<ItemDTO> equippedItems = equipmentMapper.findAllEquippedItemsByUserId(userId);

        CharacterStatusDTO statusDTO = new CharacterStatusDTO();
        statusDTO.setUserId(livePlayer.getUserId());
        statusDTO.setCharacterHp(livePlayer.getCharacterHp());
        statusDTO.setCurrentHp(livePlayer.getCurrentHp());
        statusDTO.setCharacterAp(livePlayer.getCharacterAp());
        statusDTO.setCharacterDp(livePlayer.getCharacterDp());
        statusDTO.setEquippedItems(equippedItems);

        return statusDTO;
    }

    // 캐릭터 정보 저장 메소드
    @Transactional
    public void saveCharacterState(CharacterDTO character) {
        characterMapper.updateCharacterState(character);
    }
}
