package com.leaflore.book;

import com.leaflore.user.CurrentUser;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
class CurrentReadController {

	private final CurrentUser currentUser;

	private final MyBookRepository myBooks;

	CurrentReadController(CurrentUser currentUser, MyBookRepository myBooks) {
		this.currentUser = currentUser;
		this.myBooks = myBooks;
	}

	@GetMapping("/api/me/current-read")
	@Transactional(readOnly = true)
	CurrentReadView currentRead() {
		return myBooks.findByUserIdAndStatus(currentUser.get().getId(), MyBookStatus.READING)
			.map(CurrentReadView::from)
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No current read"));
	}

}
