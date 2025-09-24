package com.misa.equipment.controller;

import com.misa.equipment.dto.EquipRequestDTO;
import com.misa.equipment.dto.UnequipRequestDTO;
import com.misa.equipment.service.CharacterEquipmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/equipment")
public class CharacterEquipmentController {

    private final CharacterEquipmentService equipmentService;

    public CharacterEquipmentController(CharacterEquipmentService equipmentService) {
        this.equipmentService = equipmentService;
    }

    // userId 검증 로직 추가 -250924
    @PostMapping("/equip")
    public ResponseEntity<Void> equipItem(@RequestBody EquipRequestDTO request, Authentication authentication) {
        if (!request.getUserId().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        equipmentService.equipItem(request.getUserId(), request.getItemCode());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/unequip")
    public ResponseEntity<Void> unequipItem(@RequestBody UnequipRequestDTO request, Authentication authentication) {
        if (!request.getUserId().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        equipmentService.unequipItem(request.getUserId(), request.getSlotCode());
        return ResponseEntity.ok().build();
    }
}
