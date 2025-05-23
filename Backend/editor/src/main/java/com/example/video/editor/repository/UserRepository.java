package com.example.video.editor.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.video.editor.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
	Optional<User> findByUsername(String username);

	Optional<User> findByEmail(String email);

	@Query("""
			    SELECT SUM(v.bytes)
			    FROM Video v
			    JOIN v.project p
			    JOIN p.workspace w
			    JOIN w.user u
			    WHERE u.id = :userId
			""")
	Long getUsedStorageByUserId(@Param("userId") Long userId);
}