package com.leaflore.session;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class SessionController {

	private final SessionService sessionService;

	SessionController(SessionService sessionService) {
		this.sessionService = sessionService;
	}

	/** Log a sitting against the reader's one current read. */
	@PostMapping("/api/me/current-read/sessions")
	@ResponseStatus(HttpStatus.CREATED)
	SessionView log(@Valid @RequestBody LogSessionRequest request) {
		return sessionService.logForCurrentRead(request);
	}

	/** The reader's sessions for one book, oldest first: one leaf each. */
	@GetMapping("/api/books/sessions")
	List<SessionView> sessionsForBook(@RequestParam(required = false) String isbn,
			@RequestParam(required = false) String asin) {
		return sessionService.sessionsForBook(isbn, asin);
	}

}
