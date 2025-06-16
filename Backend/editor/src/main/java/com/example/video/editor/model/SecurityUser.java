package com.example.video.editor.model;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SecurityUser  implements UserDetails {

    private Long userId;
    private String email;
    private String password;
    private Collection<? extends GrantedAuthority> authorities;
    private Boolean isAccountNonExpired;
    private  Boolean isAccountNonLocked;
    private Boolean isCredentialsNonExpired;
    private  Boolean isEnabled;
    private String roleName;

    public static SecurityUser build(User user) {
//        List<SimpleGrantedAuthority> authorities = null;
        String userRoleName = user.getRole() != null ? user.getRole().getRoleName() : "USER"; // Default to "USER" if role is null

        // 2. Create authorities list for Spring Security
        // It's common practice in Spring Security to prefix roles with "ROLE_"
        List<SimpleGrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + userRoleName));

        // 3. Determine account status based on UserStatus enum
        boolean isAccountNonLocked = user.getStatus() != UserStatus.BLOCKED;
        boolean isEnabled = user.getStatus() == UserStatus.ACTIVE;
        return new SecurityUser(
                user.getUserId(),
                user.getEmail(),
                user.getPasswordHash(),
                authorities,
                true,
                isAccountNonLocked,
                true,
                isEnabled,
                userRoleName // Dựa trên trạng thái kích hoạt của user
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email; // Trả về email làm username
    }

    @Override
    public boolean isAccountNonExpired() {
        return isAccountNonExpired;
    }

    @Override
    public boolean isAccountNonLocked() {
        return isAccountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return isCredentialsNonExpired;
    }

    @Override
    public boolean isEnabled() {
        return isEnabled;
    }
    public String getRoleName() {
        return roleName;
    }

}