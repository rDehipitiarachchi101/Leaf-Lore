package com.leaflore.user;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_user")
public class AppUser {

	@Id
	private Long id;

	private String displayName;

	private int dailyPageGoal;

	private Integer yearlyBookGoal;

	protected AppUser() {
	}

	public Long getId() {
		return id;
	}

	public String getDisplayName() {
		return displayName;
	}

	public int getDailyPageGoal() {
		return dailyPageGoal;
	}

	public Integer getYearlyBookGoal() {
		return yearlyBookGoal;
	}

}
