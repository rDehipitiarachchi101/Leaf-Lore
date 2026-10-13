package com.leaflore;

import java.time.Clock;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class LeafloreApplication {

	public static void main(String[] args) {
		SpringApplication.run(LeafloreApplication.class, args);
	}

	/** Injected so tests can control "now". */
	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}

}
