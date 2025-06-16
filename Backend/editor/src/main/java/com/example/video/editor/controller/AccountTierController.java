package com.example.video.editor.controller;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.video.editor.dto.AccountTierDTO;
import com.example.video.editor.mapstruct.UserMapper;
import com.example.video.editor.model.AccountTier;

@RestController
@RequestMapping("/api/account-tiers")
public class AccountTierController {
	@Autowired
	UserMapper userMapper;

	@GetMapping
	public List<AccountTierDTO> getAllTiers() {
		return Arrays.stream(AccountTier.values())
				.map(tier -> userMapper.mapAccountTier(tier)).collect(Collectors.toList());
	}



}