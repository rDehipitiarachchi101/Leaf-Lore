package com.leaflore.user;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The single place that answers "who is making this request?".
 * Until real login exists it always returns the seeded demo reader;
 * adding authentication means replacing this method, not every endpoint.
 */
@Component
public class CurrentUser {

	private final AppUserRepository users;

	private final long demoUserId;

	public CurrentUser(AppUserRepository users, @Value("${leaflore.demo-user-id}") long demoUserId) {
		this.users = users;
		this.demoUserId = demoUserId;
	}

	public AppUser get() {
		return users.findById(demoUserId)
			.orElseThrow(() -> new IllegalStateException("Demo user " + demoUserId + " is missing; check the seed migration"));
	}

}
