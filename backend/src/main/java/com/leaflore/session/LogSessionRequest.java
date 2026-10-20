package com.leaflore.session;

import java.time.LocalDate;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * What the browser is allowed to tell us: only what the reader knows.
 * The goal snapshot and timestamp are deliberately absent; the server stamps those.
 */
public record LogSessionRequest(
		@NotNull @Positive @Max(2000) Integer pagesRead,
		@NotNull LocalDate localDate,
		@NotBlank @Size(max = 2000) String pulledForward,
		@NotBlank @Size(max = 2000) String dragged) {
}
