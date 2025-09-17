package com.misa.inventory.dto;

public class InventoryItemDetailDTO {

    private String itemCode;
    private String itemName;
    private String itemType;
    private int quantity;

    public InventoryItemDetailDTO() {}

    public InventoryItemDetailDTO(String itemCode, String itemName, String itemType, int quantity) {
        this.itemCode = itemCode;
        this.itemName = itemName;
        this.itemType = itemType;
        this.quantity = quantity;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getItemType() {
        return itemType;
    }

    public void setItemType(String itemType) {
        this.itemType = itemType;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    @Override
    public String toString() {
        return "InventoryItemDetailDTO{" +
                "itemCode='" + itemCode + '\'' +
                ", itemName='" + itemName + '\'' +
                ", itemType='" + itemType + '\'' +
                ", quantity=" + quantity +
                '}';
    }
}
