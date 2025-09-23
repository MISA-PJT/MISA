package com.misa.user.service;

import com.misa.user.dao.UserMapper;
import com.misa.user.dto.UserDTO;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

// Spring Security가 DB의 사용자 정보와 일치하는지 확인할 수 있게 함.

@Service
public class UserAuthService implements UserDetailsService {

    private final UserMapper userMapper;

    public UserAuthService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // DB에서 사용자 정보 조회
        UserDTO user = userMapper.findUserById(username);
        if (user == null) {
            throw new UsernameNotFoundException("사용자를 찾을 수 없습니다. : " + username);
        }

        // Spring Security가 이해할 수 있는 UserDetails 객체로 변환하여 반환
        return User.builder()
                .username(user.getUserId())
                .password(user.getUserPwd())
                .roles(user.getUserRole())
                .build();
    }
}
