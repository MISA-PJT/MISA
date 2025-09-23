package com.misa.user.dto;

// 클라이언트가 보낸 로그인 ID와 비밀번호를 Java 객체로 받기 위해 사용
public class LoginRequestDTO {

    // Spring Security가 기본적으로 사용하는 필드명
    private String username;
    private String password;

    public LoginRequestDTO() {}

    public LoginRequestDTO(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    @Override
    public String toString() {
        return "LoginRequestDTO{" +
                "username='" + username + '\'' +
                ", password='" + password + '\'' +
                '}';
    }
}
