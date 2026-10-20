package com.leaflore.session;

import java.time.Instant;
import java.time.LocalDate;

/** Everything the frontend needs to draw one leaf and read back its reflections. */
public record SessionView(Long id, LocalDate localDate, Instant loggedAt, int pagesRead, int goalPages,
		String pulledForward, String dragged) {

	static SessionView from(ReadingSession s) {
		return new SessionView(s.getId(), s.getLocalDate(), s.getLoggedAt(), s.getPagesRead(), s.getGoalPages(),
				s.getPulledForward(), s.getDragged());
	}

}
