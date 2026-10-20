package com.leaflore;

import org.springframework.boot.SpringApplication;

public class TestLeafloreApplication {

	public static void main(String[] args) {
		SpringApplication.from(LeafloreApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
