package com.misa.character.controller;

import com.misa.character.dto.CharacterDTO;
import com.misa.character.service.CharacterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
