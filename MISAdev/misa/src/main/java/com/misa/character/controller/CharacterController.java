package com.misa.character.controller;

import com.misa.character.dto.CharacterDTO;
import com.misa.character.dto.CharacterStatusDTO;
import com.misa.character.service.CharacterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/characters")
public class CharacterController {

    private final CharacterService characterService;

    public CharacterController(CharacterService characterService) {
        this.characterService = characterService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<CharacterDTO> findCharacterById(@PathVariable String userId) {
        CharacterDTO character = characterService.findCharacterById(userId);

        if (character != null) {
            return ResponseEntity.ok(character);    // 데이터가 있으면 200 OK 와 함께 반환
        } else {
            return ResponseEntity.notFound().build();   // 데이터가 없으면 404 Not Found 반환
        }
    }

    // 캐릭터 종합 정보 조회 메소드 호출
    @GetMapping("/{userId}/status")
    public ResponseEntity<CharacterStatusDTO> getCharacterStatus(@PathVariable String userId) {
        CharacterStatusDTO status = characterService.getCharacterStatus(userId);
        if (status != null) {
            return ResponseEntity.ok(status);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // 캐릭터 정보 저장 메소드 호출
    @PostMapping("/save")
    public ResponseEntity<Void> saveCharacterState(@RequestBody CharacterDTO characterState) {
        characterService.saveCharacterState(characterState);
        return ResponseEntity.ok().build();
    }
}
