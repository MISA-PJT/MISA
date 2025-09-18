package com.misa.character.dto;

import com.misa.item.dto.ItemDTO;

import java.util.List;

// 캐릭터의 모든 정보(기본 정보, 실시간 능력치, 장착 장비)
public class CharacterStatusDTO {

    private String userId;
    private int characterHp;
    private int currentHp;
    private int characterAp;
    private int characterDp;

    private List<ItemDTO> equippedItems;

    public CharacterStatusDTO() {}

    public CharacterStatusDTO(String userId, int characterHp, int currentHp, int characterAp, int characterDp, List<ItemDTO> equippedItems) {
        this.userId = userId;
        this.characterHp = characterHp;
        this.currentHp = currentHp;
        this.characterAp = characterAp;
        this.characterDp = characterDp;
        this.equippedItems = equippedItems;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public int getCharacterHp() {
        return characterHp;
    }

    public void setCharacterHp(int characterHp) {
        this.characterHp = characterHp;
    }

    public int getCurrentHp() {
        return currentHp;
    }

    public void setCurrentHp(int currentHp) {
        this.currentHp = currentHp;
    }

    public int getCharacterAp() {
        return characterAp;
    }

    public void setCharacterAp(int characterAp) {
        this.characterAp = characterAp;
    }

    public int getCharacterDp() {
        return characterDp;
    }

    public void setCharacterDp(int characterDp) {
        this.characterDp = characterDp;
    }

    public List<ItemDTO> getEquippedItems() {
        return equippedItems;
    }

    public void setEquippedItems(List<ItemDTO> equippedItems) {
        this.equippedItems = equippedItems;
    }

    @Override
    public String toString() {
        return "CharacterStatusDTO{" +
                "userId='" + userId + '\'' +
                ", characterHp=" + characterHp +
                ", currentHp=" + currentHp +
                ", characterAp=" + characterAp +
                ", characterDp=" + characterDp +
                ", equippedItems=" + equippedItems +
                '}';
    }
}
