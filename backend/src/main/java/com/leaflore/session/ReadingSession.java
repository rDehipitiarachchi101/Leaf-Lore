package com.leaflore.session;

import java.time.Instant;
import java.time.LocalDate;

import com.leaflore.book.MyBook;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

/** One sitting with a book. Each session is drawn as one leaf. */
@Entity
public class ReadingSession {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "my_book_id")
	private MyBook myBook;

	private LocalDate localDate;

	private Instant loggedAt;

	private int pagesRead;

	private int goalPages;

	private String pulledForward;

	private String dragged;

	protected ReadingSession() {
	}

	ReadingSession(MyBook myBook, LocalDate localDate, Instant loggedAt, int pagesRead, int goalPages,
			String pulledForward, String dragged) {
		this.myBook = myBook;
		this.localDate = localDate;
		this.loggedAt = loggedAt;
		this.pagesRead = pagesRead;
		this.goalPages = goalPages;
		this.pulledForward = pulledForward;
		this.dragged = dragged;
	}

	public Long getId() {
		return id;
	}

	public MyBook getMyBook() {
		return myBook;
	}

	public LocalDate getLocalDate() {
		return localDate;
	}

	public Instant getLoggedAt() {
		return loggedAt;
	}

	public int getPagesRead() {
		return pagesRead;
	}

	public int getGoalPages() {
		return goalPages;
	}

	public String getPulledForward() {
		return pulledForward;
	}

	public String getDragged() {
		return dragged;
	}

}
