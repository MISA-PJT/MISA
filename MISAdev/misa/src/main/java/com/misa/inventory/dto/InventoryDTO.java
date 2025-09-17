package com.misa.inventory.dto;

public class InventoryDTO {

    private String userId;
    private String itemCode;
    private int quantity;

    public InventoryDTO() {}

    public InventoryDTO(String userId, String itemCode, int quantity) {
        this.userId = userId;
        this.itemCode = itemCode;
        this.quantity = quantity;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    @Override
    public String toString() {
        return "InventoryDTO{" +
                "userId='" + userId + '\'' +
                ", itemCode='" + itemCode + '\'' +
                ", quantity=" + quantity +
                '}';
    }
}
