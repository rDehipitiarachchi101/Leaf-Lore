package com.leaflore.book;

import com.leaflore.user.AppUser;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** One reader's relationship to one catalog book. */
@Entity
@Table(name = "my_book")
public class MyBook {

	@Id
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id")
	private AppUser user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "book_id")
	private Book book;

	@Enumerated(EnumType.STRING)
	private MyBookStatus status;

	private int startingPage;

	protected MyBook() {
	}

	public Long getId() {
		return id;
	}

	public AppUser getUser() {
		return user;
	}

	public Book getBook() {
		return book;
	}

	public MyBookStatus getStatus() {
		return status;
	}

	public int getStartingPage() {
		return startingPage;
	}

}
