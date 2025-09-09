-- 1. 사용자 테이블 (기준 테이블)tbl_character
CREATE TABLE `tbl_user` (
    `user_id` VARCHAR(255) NOT NULL COMMENT 'ID',
    `user_pwd` VARCHAR(100) NOT NULL COMMENT 'PWD (Hashed)',
    `user_name` VARCHAR(30) NOT NULL COMMENT '이름',
    `user_email` VARCHAR(255) NOT NULL COMMENT 'Email',
    `user_role` VARCHAR(30) NOT NULL DEFAULT 'ROLE_USER' COMMENT '역할 (ROLE_USER, ROLE_ADMIN)',
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `uk_user_email` (`user_email`) -- 이메일 중복 방지
) COMMENT = '사용자';

-- 2. 캐릭터 테이블 (사용자 테이블 참조)
CREATE TABLE `tbl_character` (
    `user_id` VARCHAR(255) NOT NULL COMMENT 'ID',
    `character_hp` INT NOT NULL DEFAULT 100 COMMENT 'HP',
    `character_ap` INT NOT NULL DEFAULT 10 COMMENT '공격력',
    `character_dp` INT NOT NULL DEFAULT 5 COMMENT '방어력',
    PRIMARY KEY (`user_id`),
    CONSTRAINT `fk_character_to_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT = '캐릭터';

-- 3. 장착부위 테이블 (아이템 테이블 참조 전 생성)
CREATE TABLE `tbl_equipment_slot` (
    `slot_code` VARCHAR(30) NOT NULL COMMENT '장착부위 코드 (helmet, weapon, armor)',
    `slot_name` VARCHAR(30) NOT NULL COMMENT '장착부위명',
    PRIMARY KEY (`slot_code`)
) COMMENT = '장착부위';

-- 4. 아이템 테이블 (장착부위 테이블 참조)
CREATE TABLE `tbl_item` (
    `item_code` VARCHAR(30) NOT NULL COMMENT '아이템 코드',
    `item_name` VARCHAR(30) NOT NULL COMMENT '아이템명',
    `item_type` VARCHAR(30) NOT NULL COMMENT '아이템 유형 (equipment, consumable)',
    `item_hp` INT NOT NULL DEFAULT 0 COMMENT '추가 HP',
    `item_ap` INT NOT NULL DEFAULT 0 COMMENT '추가 공격력',
    `item_dp` INT NOT NULL DEFAULT 0 COMMENT '추가 방어력',
    `slot_code` VARCHAR(30) NULL COMMENT '장착부위 코드', -- 장비가 아닌 경우 NULL 허용
    PRIMARY KEY (`item_code`),
    CONSTRAINT `fk_item_to_slot` FOREIGN KEY (`slot_code`) REFERENCES `tbl_equipment_slot` (`slot_code`) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT = '아이템';

-- 5. 인벤토리 테이블 (사용자, 아이템 테이블 참조)
CREATE TABLE `tbl_inventory` (
    `user_id` VARCHAR(255) NOT NULL COMMENT 'ID',
    `item_code` VARCHAR(30) NOT NULL COMMENT '아이템 코드',
    `item_quantity` INT NOT NULL DEFAULT 1 COMMENT '수량',
    PRIMARY KEY (`user_id`, `item_code`),
    CONSTRAINT `fk_inventory_to_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_inventory_to_item` FOREIGN KEY (`item_code`) REFERENCES `tbl_item` (`item_code`) ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT = '인벤토리';

-- 6. 캐릭터 장비 테이블 (사용자, 아이템, 장착부위 테이블 참조)
CREATE TABLE `tbl_character_equipment` (
    `user_id` VARCHAR(255) NOT NULL COMMENT 'ID',
    `slot_code` VARCHAR(30) NOT NULL COMMENT '장착부위 코드',
    `item_code` VARCHAR(30) NOT NULL COMMENT '아이템 코드',
    PRIMARY KEY (`user_id`, `slot_code`),
    CONSTRAINT `fk_equipment_to_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_equipment_to_slot` FOREIGN KEY (`slot_code`) REFERENCES `tbl_equipment_slot` (`slot_code`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_equipment_to_item` FOREIGN KEY (`item_code`) REFERENCES `tbl_item` (`item_code`) ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT = '캐릭터 장비';

-- 7. 몬스터 테이블
CREATE TABLE `tbl_monster` (
    `monster_code` VARCHAR(30) NOT NULL COMMENT '몬스터코드',
    `monster_name` VARCHAR(30) NOT NULL COMMENT '몬스터명',
    `monster_hp` INT NOT NULL COMMENT 'HP',
    `monster_ap` INT NOT NULL COMMENT '공격력',
    `monster_dp` INT NOT NULL COMMENT '방어력',
    PRIMARY KEY (`monster_code`)
) COMMENT = '몬스터';

-- 8. 몬스터 드랍 리스트 (몬스터, 아이템 테이블 참조)
CREATE TABLE `tbl_monster_drop_list` (
    `monster_code` VARCHAR(30) NOT NULL COMMENT '몬스터코드',
    `item_code` VARCHAR(30) NOT NULL COMMENT '아이템 코드',
    `drop_rate` DECIMAL(5, 2) NOT NULL COMMENT '드랍 확률 (0.00 ~ 100.00)',
    PRIMARY KEY (`monster_code`, `item_code`),
    CONSTRAINT `fk_drop_to_monster` FOREIGN KEY (`monster_code`) REFERENCES `tbl_monster` (`monster_code`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_drop_to_item` FOREIGN KEY (`item_code`) REFERENCES `tbl_item` (`item_code`) ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT = '드랍 아이템';

-- 9. 문의 테이블 (사용자 테이블 참조)
CREATE TABLE `tbl_qa` (
    `qa_code` INT AUTO_INCREMENT NOT NULL COMMENT '문의코드', -- VARCHAR -> INT AUTO_INCREMENT (관리 편의)
    `user_id` VARCHAR(255) NOT NULL COMMENT 'ID',
    `qa_title` VARCHAR(255) NOT NULL COMMENT '제목', -- 컬럼명 수정 (qa_name -> qa_title)
    `q_content` VARCHAR(1000) NOT NULL COMMENT '문의내용',
    `q_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '문의일',
    `qa_status` VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT '상태 (pending, answered)',
    `a_content` VARCHAR(1000) COMMENT '답변내용',
    `a_date` DATETIME COMMENT '답변일',
    PRIMARY KEY (`qa_code`),
    CONSTRAINT `fk_qa_to_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT = '문의';