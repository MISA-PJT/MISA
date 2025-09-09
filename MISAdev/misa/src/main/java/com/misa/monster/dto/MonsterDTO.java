package com.misa.monster.dto;

import java.util.List;

public class MonsterDTO {

    private String monsterCode;
    private String monsterName;
    private int hp;
    private int ap;
    private int dp;

    // 몬스터가 드랍하는 아이템 목록
    private List<MonsterDropDTO> dropList;

    public MonsterDTO () {}

    public MonsterDTO(String monsterCode, String monsterName, int hp, int ap, int dp, List<MonsterDropDTO> dropList) {
        this.monsterCode = monsterCode;
        this.monsterName = monsterName;
        this.hp = hp;
        this.ap = ap;
        this.dp = dp;
        this.dropList = dropList;
    }

    public String getMonsterCode() {
        return monsterCode;
    }

    public void setMonsterCode(String monsterCode) {
        this.monsterCode = monsterCode;
    }

    public String getMonsterName() {
        return monsterName;
    }

    public void setMonsterName(String monsterName) {
        this.monsterName = monsterName;
    }

    public int getHp() {
        return hp;
    }

    public void setHp(int hp) {
        this.hp = hp;
    }

    public int getAp() {
        return ap;
    }

    public void setAp(int ap) {
        this.ap = ap;
    }

    public int getDp() {
        return dp;
    }

    public void setDp(int dp) {
        this.dp = dp;
    }

    public List<MonsterDropDTO> getDropList() {
        return dropList;
    }

    public void setDropList(List<MonsterDropDTO> dropList) {
        this.dropList = dropList;
    }

    @Override
    public String toString() {
        return "MonsterDTO{" +
                "monsterCode='" + monsterCode + '\'' +
                ", monsterName='" + monsterName + '\'' +
                ", hp=" + hp +
                ", ap=" + ap +
                ", dp=" + dp +
                ", dropList=" + dropList +
                '}';
    }
}
