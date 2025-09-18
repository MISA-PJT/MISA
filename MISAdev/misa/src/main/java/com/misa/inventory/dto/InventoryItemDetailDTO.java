package com.misa.inventory.dto;

public class InventoryItemDetailDTO {

    private String itemCode;
    private String itemName;
    private String itemType;
    private int quantity;

    private int itemHp;
    private int itemAp;
    private int itemDp;
    private String slotName;

    public InventoryItemDetailDTO() {}

    public InventoryItemDetailDTO(String itemCode, String itemName, String itemType, int quantity, int itemHp, int itemAp, int itemDp, String slotName) {
        this.itemCode = itemCode;
        this.itemName = itemName;
        this.itemType = itemType;
        this.quantity = quantity;
        this.itemHp = itemHp;
        this.itemAp = itemAp;
        this.itemDp = itemDp;
        this.slotName = slotName;
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

    public int getItemHp() {
        return itemHp;
    }

    public void setItemHp(int itemHp) {
        this.itemHp = itemHp;
    }

    public int getItemAp() {
        return itemAp;
    }

    public void setItemAp(int itemAp) {
        this.itemAp = itemAp;
    }

    public int getItemDp() {
        return itemDp;
    }

    public void setItemDp(int itemDp) {
        this.itemDp = itemDp;
    }

    public String getSlotName() {
        return slotName;
    }

    public void setSlotName(String slotName) {
        this.slotName = slotName;
    }

    @Override
    public String toString() {
        return "InventoryItemDetailDTO{" +
                "itemCode='" + itemCode + '\'' +
                ", itemName='" + itemName + '\'' +
                ", itemType='" + itemType + '\'' +
                ", quantity=" + quantity +
                ", itemHp=" + itemHp +
                ", itemAp=" + itemAp +
                ", itemDp=" + itemDp +
                ", slotName='" + slotName + '\'' +
                '}';
    }
}
