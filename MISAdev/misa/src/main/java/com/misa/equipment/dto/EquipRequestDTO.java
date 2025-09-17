package com.misa.equipment.dto;

public class EquipRequestDTO {

    private String userId;
    private String itemCode;

    public EquipRequestDTO() {}

    public EquipRequestDTO(String userId, String itemCode) {
        this.userId = userId;
        this.itemCode = itemCode;
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

    @Override
    public String toString() {
        return "EquipRequestDTO{" +
                "userId='" + userId + '\'' +
                ", itemCode='" + itemCode + '\'' +
                '}';
    }
}
