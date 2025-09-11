package com.misa.monster.controller;

import com.misa.monster.dto.MonsterDTO;
import com.misa.monster.service.MonsterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// @Controller 사용 시 데이터를 반환하려면 해당 메소드에 @ResponseBody 를 별도로 붙여줘야 함.
// @RestController 사용 시 모든 메소드에 @ResponseBody 가 붙은 것과 같음.
@RestController     // @Controller + ResponseBody
@RequestMapping("/api/monsters")
public class MonsterController {

    private final MonsterService monsterService;

    // 생성자를 통해 MonsterService 의존성 주입
    public MonsterController(MonsterService monsterService) {
        this.monsterService = monsterService;
    }

    // 모든 몬스터 스폰 정보를 조회하는 API 엔드 포인트
    // HTTP GET 요청을 /api/monsters 주소로 받음.
    @GetMapping
    public ResponseEntity<List<MonsterDTO>> findAllMonsters() {
        List<MonsterDTO> monsters = monsterService.findAllMonsters();
        return ResponseEntity.ok(monsters);
    }
}
