package com.leaflore.user;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class GoalController {

	record GoalView(int dailyPageGoal) {
	}

	private final CurrentUser currentUser;

	GoalController(CurrentUser currentUser) {
		this.currentUser = currentUser;
	}

	@GetMapping("/api/me/goal")
	GoalView goal() {
		return new GoalView(currentUser.get().getDailyPageGoal());
	}

}
