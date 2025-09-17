package com.misa.monster.service;

import com.misa.monster.dto.MonsterDTO;
import com.misa.monster.dao.MonsterMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MonsterService {

    private final MonsterMapper monsterMapper;

    // 생성자 주입
    @Autowired
    public MonsterService(MonsterMapper monsterMapper) {
        this.monsterMapper = monsterMapper;
    }

    // 모든 몬스터의 스폰 정보 조회
    public List<MonsterDTO> findAllMonsters() {
        // Mapper의 메소드를 호출하여 DB 조회 결과 반환
        return monsterMapper.findAllMonsters();
    }

    public MonsterDTO findBySpawnId(int targetSpawnId) {
        return monsterMapper.findAllMonsters().get(targetSpawnId);
    }
}
