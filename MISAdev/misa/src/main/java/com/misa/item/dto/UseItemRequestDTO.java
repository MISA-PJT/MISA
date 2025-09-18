package com.misa.item.dto;

public class UseItemRequestDTO {

    private String userId;
    private String itemCode;

    public UseItemRequestDTO() {}

    public UseItemRequestDTO(String userId, String itemCode) {
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
        return "UseItemRequestDTO{" +
                "userId='" + userId + '\'' +
                ", itemCode='" + itemCode + '\'' +
                '}';
    }
}
