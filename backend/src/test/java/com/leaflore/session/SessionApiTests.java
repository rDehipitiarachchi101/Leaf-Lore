package com.leaflore.session;

import java.time.LocalDate;
import java.time.ZoneOffset;

import com.leaflore.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Round trip against a real Postgres (Docker via Testcontainers), using the seeded demo reader:
 * daily goal 20, current read "The Lantern Orchard" (ISBN 9780000000002, ASIN B0DEMO0001).
 * Each test rolls back, so they don't see each other's sessions.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class SessionApiTests {

	@Autowired
	MockMvc mvc;

	private static String today() {
		return LocalDate.now(ZoneOffset.UTC).toString();
	}

	@Test
	void loggedSessionCanBeReadBackWithEverythingNeededToDrawTheLeaf() throws Exception {
		mvc.perform(post("/api/me/current-read/sessions").contentType(MediaType.APPLICATION_JSON).content("""
				{"pagesRead": 14, "localDate": "%s",
				 "pulledForward": "The orchard map chapter", "dragged": "Slow council scene"}
				""".formatted(today())))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.goalPages").value(20));

		mvc.perform(get("/api/books/sessions").param("isbn", "9780000000002"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$", hasSize(1)))
			.andExpect(jsonPath("$[0].localDate").value(today()))
			.andExpect(jsonPath("$[0].pagesRead").value(14))
			.andExpect(jsonPath("$[0].goalPages").value(20))
			.andExpect(jsonPath("$[0].pulledForward").value("The orchard map chapter"))
			.andExpect(jsonPath("$[0].dragged").value("Slow council scene"));

		// Same book found by ASIN alone
		mvc.perform(get("/api/books/sessions").param("asin", "B0DEMO0001"))
			.andExpect(jsonPath("$", hasSize(1)));
	}

	@Test
	void goalSentByTheClientIsIgnoredInFavourOfTheServersGoal() throws Exception {
		mvc.perform(post("/api/me/current-read/sessions").contentType(MediaType.APPLICATION_JSON).content("""
				{"pagesRead": 5, "localDate": "%s", "goalPages": 1,
				 "pulledForward": "a", "dragged": "b"}
				""".formatted(today())))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.goalPages").value(20));
	}

	@Test
	void rejectsNonPositivePagesAndBlankReflections() throws Exception {
		mvc.perform(post("/api/me/current-read/sessions").contentType(MediaType.APPLICATION_JSON).content("""
				{"pagesRead": 0, "localDate": "%s", "pulledForward": " ", "dragged": "b"}
				""".formatted(today())))
			.andExpect(status().isBadRequest());
	}

	@Test
	void rejectsADateFarFromToday() throws Exception {
		mvc.perform(post("/api/me/current-read/sessions").contentType(MediaType.APPLICATION_JSON).content("""
				{"pagesRead": 5, "localDate": "2020-01-01", "pulledForward": "a", "dragged": "b"}
				"""))
			.andExpect(status().isBadRequest());
	}

	@Test
	void unknownBookIsNotFound() throws Exception {
		mvc.perform(get("/api/books/sessions").param("isbn", "0000000000000")).andExpect(status().isNotFound());
	}

	@Test
	void bootstrapEndpointsReturnTheCurrentReadAndGoal() throws Exception {
		mvc.perform(get("/api/me/current-read"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.book.title").value("The Lantern Orchard"))
			.andExpect(jsonPath("$.book.pageCount").value(312));
		mvc.perform(get("/api/me/goal")).andExpect(jsonPath("$.dailyPageGoal").value(20));
	}

}
