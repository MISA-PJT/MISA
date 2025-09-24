package com.misa.monster.dto;

public class MonsterDropDTO {

    private String itemCode;
    private double dropRate;

    public MonsterDropDTO() {}

    public MonsterDropDTO(String itemCode, double dropRate) {
        this.itemCode = itemCode;
        this.dropRate = dropRate;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public double getDropRate() {
        return dropRate;
    }

    public void setDropRate(double dropRate) {
        this.dropRate = dropRate;
    }

    @Override
    public String toString() {
        return "MonsterDropDTO{" +
                "itemCode='" + itemCode + '\'' +
                ", dropRate=" + dropRate +
                '}';
    }
}
