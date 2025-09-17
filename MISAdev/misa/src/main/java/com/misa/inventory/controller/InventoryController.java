package com.misa.inventory.controller;

import com.misa.inventory.dto.InventoryDTO;
import com.misa.inventory.dto.InventoryItemDetailDTO;
import com.misa.inventory.service.InventoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<InventoryItemDetailDTO>> findInventoryByUserId(@PathVariable String userId) {
        List<InventoryItemDetailDTO> inventory = inventoryService.findInventoryByUserId(userId);
        return ResponseEntity.ok(inventory);
    }
}
