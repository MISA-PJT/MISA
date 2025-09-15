package com.misa.monster.dto;

import java.util.List;

// lombok 어노테이션 사용 -> 버그 발생 가능성이 있어 폐기
//@Getter
//@Setter
//@ToString
//@NoArgsConstructor  // 기본 생성자
//@AllArgsConstructor // 모든 필드 포함 생성자
public class MonsterDTO {

    private int spawnId;
    private String monsterCode;
    private String monsterName;
    private int hp;
    private int ap;
    private int dp;
    private String state;

    // 몬스터가 드랍하는 아이템 목록
    private List<MonsterDropDTO> dropList;

    // 몬스터 위치 정보
    private double latitude;
    private double longitude;

    public MonsterDTO() {}

    public MonsterDTO(int spawnId, String monsterCode, String monsterName, int hp, int ap, int dp, String state, List<MonsterDropDTO> dropList, double latitude, double longitude) {
        this.spawnId = spawnId;
        this.monsterCode = monsterCode;
        this.monsterName = monsterName;
        this.hp = hp;
        this.ap = ap;
        this.dp = dp;
        this.state = state;
        this.dropList = dropList;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public int getSpawnId() {
        return spawnId;
    }

    public void setSpawnId(int spawnId) {
        this.spawnId = spawnId;
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

    @Override
    public String toString() {
        return "MonsterDTO{" +
                "spawnId=" + spawnId +
                ", monsterCode='" + monsterCode + '\'' +
                ", monsterName='" + monsterName + '\'' +
                ", hp=" + hp +
                ", ap=" + ap +
                ", dp=" + dp +
                ", state='" + state + '\'' +
                ", dropList=" + dropList +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                '}';
    }

    // 몬스터 실시간 상태 관리를 위한 복사 생성자 추가 -250915
    public MonsterDTO(MonsterDTO original) {
        this.spawnId = original.spawnId;
        this.monsterCode = original.monsterCode;
        this.monsterName = original.monsterName;
        this.hp = original.hp;
        this.ap = original.ap;
        this.dp = original.dp;
        this.dropList = original.dropList;
        this.latitude = original.latitude;
        this.longitude = original.longitude;
        this.state = "idle";
    }
}
