package com.misa.character.dto;

public class CharacterDTO {

    // DB 기본정보
    private String userId;
    private int characterHp;
    private int characterAp;
    private int characterDp;

    // 실시간 정보 DB 미사용 (서버 메모리에서 관리)
    private double latitude;
    private double longitude;
    private int currentHp;

    public CharacterDTO() {}

    public CharacterDTO(String userId, int characterHp, int characterAp, int characterDp, double latitude, double longitude, int currentHp) {
        this.userId = userId;
        this.characterHp = characterHp;
        this.characterAp = characterAp;
        this.characterDp = characterDp;
        this.latitude = latitude;
        this.longitude = longitude;
        this.currentHp = currentHp;
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

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public int getCurrentHp() {
        return currentHp;
    }

    public void setCurrentHp(int currentHp) {
        this.currentHp = currentHp;
    }

    @Override
    public String toString() {
        return "CharacterDTO{" +
                "userId='" + userId + '\'' +
                ", characterHp=" + characterHp +
                ", characterAp=" + characterAp +
                ", characterDp=" + characterDp +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", currentHp=" + currentHp +
                '}';
    }
}
