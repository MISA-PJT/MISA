package com.misa.equipment.dto;

public class UnequipRequestDTO {

    private String userId;
    private String slotCode;

    public UnequipRequestDTO() {}

    public UnequipRequestDTO(String userId, String slotCode) {
        this.userId = userId;
        this.slotCode = slotCode;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getSlotCode() {
        return slotCode;
    }

    public void setSlotCode(String slotCode) {
        this.slotCode = slotCode;
    }

    @Override
    public String toString() {
        return "UnequipRequestDTO{" +
                "userId='" + userId + '\'' +
                ", slotCode='" + slotCode + '\'' +
                '}';
    }
}
