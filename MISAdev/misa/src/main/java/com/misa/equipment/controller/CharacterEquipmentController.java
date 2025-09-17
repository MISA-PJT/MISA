package com.misa.equipment.controller;

import com.misa.equipment.dto.EquipRequestDTO;
import com.misa.equipment.dto.UnequipRequestDTO;
import com.misa.equipment.service.CharacterEquipmentService;
import org.springframework.http.ResponseEntity;
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

    @PostMapping("/equip")
    public ResponseEntity<Void> equipItem(@RequestBody EquipRequestDTO request) {
        equipmentService.equipItem(request.getUserId(), request.getItemCode());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/unequip")
    public ResponseEntity<Void> unequipItem(@RequestBody UnequipRequestDTO request) {
        equipmentService.unequipItem(request.getUserId(), request.getSlotCode());
        return ResponseEntity.ok().build();
    }
}
