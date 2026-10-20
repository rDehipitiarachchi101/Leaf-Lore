package com.leaflore.book;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MyBookRepository extends JpaRepository<MyBook, Long> {

	@EntityGraph(attributePaths = "book")
	Optional<MyBook> findByUserIdAndStatus(Long userId, MyBookStatus status);

	Optional<MyBook> findByUserIdAndBookId(Long userId, Long bookId);

}
