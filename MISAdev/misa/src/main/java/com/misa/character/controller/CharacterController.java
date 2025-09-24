package com.misa.character.controller;

import com.misa.character.dto.CharacterDTO;
import com.misa.character.dto.CharacterStatusDTO;
import com.misa.character.service.CharacterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/characters")
public class CharacterController {

    private final CharacterService characterService;

    public CharacterController(CharacterService characterService) {
        this.characterService = characterService;
    }

    // userId 검증 로직 추가 -250924
    @GetMapping("/{userId}")
    public ResponseEntity<CharacterDTO> findCharacterById(@PathVariable String userId, Authentication authentication) {
        if (!userId.equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        CharacterDTO character = characterService.findCharacterById(userId);
        return character != null ? ResponseEntity.ok(character) : ResponseEntity.notFound().build();
    }

    // 캐릭터 종합 정보 조회 메소드 호출
    // userId 검증 로직 추가 -250924
    @GetMapping("/{userId}/status")
    public ResponseEntity<CharacterStatusDTO> getCharacterStatus(@PathVariable String userId, Authentication authentication) {
        if (!userId.equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        CharacterStatusDTO status = characterService.getCharacterStatus(userId);
        return status != null ? ResponseEntity.ok(status) : ResponseEntity.notFound().build();
    }

    // 캐릭터 정보 저장 메소드 호출
    // userId 검증 로직 추가 -250924
    @PostMapping("/save")
    public ResponseEntity<Void> saveCharacterState(@RequestBody CharacterDTO characterState, Authentication authentication) {
        if (!characterState.getUserId().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        characterService.saveCharacterState(characterState);
        return ResponseEntity.ok().build();
    }
}
