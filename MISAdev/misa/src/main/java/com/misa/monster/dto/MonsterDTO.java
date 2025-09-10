package com.misa.monster.dto;

import java.util.List;

// lombok 어노테이션 사용 -> 버그 발생 가능성이 있어 폐기
//@Getter
//@Setter
//@ToString
//@NoArgsConstructor  // 기본 생성자
//@AllArgsConstructor // 모든 필드 포함 생성자
public class MonsterDTO {

    private String monsterCode;
    private String monsterName;
    private int hp;
    private int ap;
    private int dp;

    // 몬스터가 드랍하는 아이템 목록
    private List<MonsterDropDTO> dropList;

    // 몬스터 위치 정보
    private double latitude;
    private double longitude;


}
