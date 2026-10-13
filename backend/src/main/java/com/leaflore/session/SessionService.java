package com.leaflore.session;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import com.leaflore.book.Book;
import com.leaflore.book.BookRepository;
import com.leaflore.book.MyBook;
import com.leaflore.book.MyBookRepository;
import com.leaflore.book.MyBookStatus;
import com.leaflore.user.AppUser;
import com.leaflore.user.CurrentUser;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SessionService {

	/** Timezones span UTC-12..UTC+14, so a reader's "today" is within a day of the server's UTC date. */
	private static final long MAX_DAYS_FROM_SERVER_DATE = 1;

	private final CurrentUser currentUser;

	private final MyBookRepository myBooks;

	private final BookRepository books;

	private final ReadingSessionRepository sessions;

	private final Clock clock;

	SessionService(CurrentUser currentUser, MyBookRepository myBooks, BookRepository books,
			ReadingSessionRepository sessions, Clock clock) {
		this.currentUser = currentUser;
		this.myBooks = myBooks;
		this.books = books;
		this.sessions = sessions;
		this.clock = clock;
	}

	@Transactional
	public SessionView logForCurrentRead(LogSessionRequest request) {
		AppUser user = currentUser.get();
		MyBook currentRead = myBooks.findByUserIdAndStatus(user.getId(), MyBookStatus.READING)
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "No current read to log against"));

		LocalDate serverDate = LocalDate.now(clock.withZone(ZoneOffset.UTC));
		long daysApart = Math.abs(request.localDate().toEpochDay() - serverDate.toEpochDay());
		if (daysApart > MAX_DAYS_FROM_SERVER_DATE) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "localDate must be today in the reader's timezone");
		}

		// Server-owned values: the goal as of right now, and when the request arrived.
		ReadingSession session = new ReadingSession(currentRead, request.localDate(), clock.instant(),
				request.pagesRead(), user.getDailyPageGoal(), request.pulledForward().strip(), request.dragged().strip());
		return SessionView.from(sessions.save(session));
	}

	@Transactional(readOnly = true)
	public List<SessionView> sessionsForBook(String isbn, String asin) {
		Book book = findBook(isbn, asin);
		AppUser user = currentUser.get();
		return myBooks.findByUserIdAndBookId(user.getId(), book.getId())
			.map(myBook -> sessions.findByMyBookIdOrderByLoggedAtAsc(myBook.getId()).stream().map(SessionView::from).toList())
			.orElse(List.of());
	}

	private Book findBook(String isbn, String asin) {
		if (isBlank(isbn) && isBlank(asin)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide an isbn or asin");
		}
		var byIsbn = isBlank(isbn) ? Optional.<Book>empty() : books.findByIsbn(isbn);
		return byIsbn.or(() -> isBlank(asin) ? Optional.empty() : books.findByAsin(asin))
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No book with that isbn/asin"));
	}

	private static boolean isBlank(String s) {
		return s == null || s.isBlank();
	}

}
