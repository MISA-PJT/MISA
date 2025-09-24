package com.misa.inventory.controller;

import com.misa.inventory.dto.InventoryItemDetailDTO;
import com.misa.inventory.service.InventoryService;
import com.misa.item.dto.UseItemRequestDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    // userId 검증 로직 추가 -250924
    @GetMapping("/{userId}")
    public ResponseEntity<List<InventoryItemDetailDTO>> findInventoryByUserId(@PathVariable String userId, Authentication authentication) {
        if (!userId.equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<InventoryItemDetailDTO> inventory = inventoryService.findInventoryByUserId(userId);
        return ResponseEntity.ok(inventory);
    }

    // userId 검증 로직 추가 -250924
    @PostMapping("/use")
    public ResponseEntity<Void> useItem(@RequestBody UseItemRequestDTO request, Authentication authentication) {
        if (!request.getUserId().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        inventoryService.useItem(request.getUserId(), request.getItemCode());
        return ResponseEntity.ok().build();
    }
}
