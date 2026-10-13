package com.leaflore.book;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CurrentReadView(Long myBookId, MyBookStatus status, int startingPage, BookView book) {

	public record BookView(String title, String authors, LocalDate publishedDate, String genre, String format,
			String isbn, String asin, BigDecimal averageRating, Integer pageCount) {
	}

	static CurrentReadView from(MyBook myBook) {
		Book b = myBook.getBook();
		return new CurrentReadView(myBook.getId(), myBook.getStatus(), myBook.getStartingPage(),
				new BookView(b.getTitle(), b.getAuthors(), b.getPublishedDate(), b.getGenre(), b.getFormat(),
						b.getIsbn(), b.getAsin(), b.getAverageRating(), b.getPageCount()));
	}

}
