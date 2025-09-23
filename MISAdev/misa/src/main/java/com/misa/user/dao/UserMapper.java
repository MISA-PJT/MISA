package com.misa.user.dao;

import com.misa.user.dto.UserDTO;
import org.apache.ibatis.annotations.Mapper;

// DB의 tbl_user 테이블 데이터를 조회

@Mapper
public interface UserMapper {

    UserDTO findUserById(String userId);
}
