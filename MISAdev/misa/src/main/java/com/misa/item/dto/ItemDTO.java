package com.misa.item.dto;

public class ItemDTO {

    private String itemCode;
    private String itemName;
    private String itemType;
    private int itemHp;
    private int itemAp;
    private int itemDp;
    private String slotCode;
    private String slotName;

    public ItemDTO() {}

    public ItemDTO(String itemCode, String itemName, String itemType, int itemHp, int itemAp, int itemDp, String slotCode, String slotName) {
        this.itemCode = itemCode;
        this.itemName = itemName;
        this.itemType = itemType;
        this.itemHp = itemHp;
        this.itemAp = itemAp;
        this.itemDp = itemDp;
        this.slotCode = slotCode;
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

    public String getSlotCode() {
        return slotCode;
    }

    public void setSlotCode(String slotCode) {
        this.slotCode = slotCode;
    }

    public String getSlotName() {
        return slotName;
    }

    public void setSlotName(String slotName) {
        this.slotName = slotName;
    }

    @Override
    public String toString() {
        return "ItemDTO{" +
                "itemCode='" + itemCode + '\'' +
                ", itemName='" + itemName + '\'' +
                ", itemType='" + itemType + '\'' +
                ", itemHp=" + itemHp +
                ", itemAp=" + itemAp +
                ", itemDp=" + itemDp +
                ", slotCode='" + slotCode + '\'' +
                ", slotName='" + slotName + '\'' +
                '}';
    }
}
