package com.leaflore.book;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** Shared catalog entry: facts that are the same for every reader. */
@Entity
public class Book {

	@Id
	private Long id;

	private String title;

	private String authors;

	private LocalDate publishedDate;

	private String genre;

	private String format;

	private String isbn;

	private String asin;

	private BigDecimal averageRating;

	private Integer pageCount;

	protected Book() {
	}

	public Long getId() {
		return id;
	}

	public String getTitle() {
		return title;
	}

	public String getAuthors() {
		return authors;
	}

	public LocalDate getPublishedDate() {
		return publishedDate;
	}

	public String getGenre() {
		return genre;
	}

	public String getFormat() {
		return format;
	}

	public String getIsbn() {
		return isbn;
	}

	public String getAsin() {
		return asin;
	}

	public BigDecimal getAverageRating() {
		return averageRating;
	}

	public Integer getPageCount() {
		return pageCount;
	}

}
