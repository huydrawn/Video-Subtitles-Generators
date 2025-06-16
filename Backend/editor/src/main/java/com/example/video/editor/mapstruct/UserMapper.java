package com.example.video.editor.mapstruct;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.video.editor.dto.AccountTierDTO;
import com.example.video.editor.dto.UserDTO;
import com.example.video.editor.model.AccountTier;
import com.example.video.editor.model.User;

@Mapper(componentModel = "spring", uses = { WorkspaceMapper.class })
public interface UserMapper {
	@Mapping(target = "workspace", source = "workspace")
	@Mapping(target = "accountTier", expression = "java(mapAccountTier(user.getAccountTier()))")
	@Mapping(target = "roleName", source = "role.roleName")
	UserDTO toDto(User user);

	default AccountTierDTO mapAccountTier(AccountTier tier) {

		if (tier == null)
			tier = AccountTier.FREE;

		return AccountTierDTO.builder().name(tier.name()).storageLimitMb(tier.getStorageLimitMb())
				.priceInCents(tier.getPriceInCents()).formattedPrice(tier.getFormattedPrice()).build();
	}
}
