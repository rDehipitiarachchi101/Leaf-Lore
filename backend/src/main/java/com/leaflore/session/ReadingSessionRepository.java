package com.leaflore.session;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReadingSessionRepository extends JpaRepository<ReadingSession, Long> {

	List<ReadingSession> findByMyBookIdOrderByLoggedAtAsc(Long myBookId);

}
