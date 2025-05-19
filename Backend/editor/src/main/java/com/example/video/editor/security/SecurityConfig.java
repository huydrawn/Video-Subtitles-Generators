package com.example.video.editor.security;

import java.util.HashMap;
import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.client.RestTemplate;

import com.example.video.editor.config.constant.SecurityConstants;
import com.example.video.editor.security.filter.JwtAuthenticationFilter;
import com.example.video.editor.security.oauth.CustomOAuth2SuccessHandler;
import com.example.video.editor.service.CustomUserDetailsService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {
	private final CustomOAuth2SuccessHandler customOAuth2SuccessHandler;
	private final JwtAuthenticationFilter jwtAuthFilter;
	private final CustomUserDetailsService userDetailsService;

	@Bean
	public RestTemplate restTemplate() {
		return new RestTemplate();
	}

	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
		return config.getAuthenticationManager();
	}

	@Bean
	public AuthenticationProvider daoAuthenticationProvider() {
		DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
		provider.setUserDetailsService(userDetailsService);
		provider.setPasswordEncoder(passwordEncoder());
		return provider;
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http,
			ClientRegistrationRepository clientRegistrationRepository) throws Exception {
		http.csrf(csrf -> csrf.disable())
				.authorizeHttpRequests(auth -> auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers(SecurityConstants.PUBLIC_URLS.toArray(new String[0])).permitAll().anyRequest()
						.authenticated())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authenticationProvider(daoAuthenticationProvider())
				.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
				.oauth2Login(oauth2 -> oauth2
						.authorizationEndpoint(authorization -> authorization.authorizationRequestResolver(
								customAuthorizationRequestResolver(clientRegistrationRepository)))
						.successHandler(customOAuth2SuccessHandler));
		return http.build();
	}

	private OAuth2AuthorizationRequestResolver customAuthorizationRequestResolver(ClientRegistrationRepository repo) {
		DefaultOAuth2AuthorizationRequestResolver defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(repo,
				"/oauth2/authorization");

		return new OAuth2AuthorizationRequestResolver() {
			@Override
			public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
				OAuth2AuthorizationRequest authRequest = defaultResolver.resolve(request);
				if (authRequest == null)
					return null;

				String redirectUri = request.getParameter("redirect_uri");
				Map<String, Object> additionalParams = new HashMap<>(authRequest.getAdditionalParameters());

				if (redirectUri != null) {
					request.getSession().setAttribute("redirect_uri", redirectUri);
				}

				return OAuth2AuthorizationRequest.from(authRequest).additionalParameters(additionalParams).build();
			}

			@Override
			public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
				OAuth2AuthorizationRequest authRequest = defaultResolver.resolve(request, clientRegistrationId);
				if (authRequest == null)
					return null;

				String redirectUri = request.getParameter("redirect_uri");
				Map<String, Object> additionalParams = new HashMap<>(authRequest.getAdditionalParameters());

				if (redirectUri != null) {
					additionalParams.put("redirect_uri", redirectUri);
					request.getSession().setAttribute("redirect_uri", redirectUri);
				}

				return OAuth2AuthorizationRequest.from(authRequest).additionalParameters(additionalParams).build();
			}
		};
	}
}
