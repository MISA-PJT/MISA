package com.misa.inventory.controller;

import com.misa.inventory.dto.InventoryDTO;
import com.misa.inventory.dto.InventoryItemDetailDTO;
import com.misa.inventory.service.InventoryService;
import com.misa.item.dto.UseItemRequestDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/use")
    public ResponseEntity<Void> useItem(@RequestBody UseItemRequestDTO request) {
        inventoryService.useItem(request.getUserId(), request.getItemCode());
        return ResponseEntity.ok().build();
    }
}
