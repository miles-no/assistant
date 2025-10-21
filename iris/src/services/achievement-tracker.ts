/**
 * Achievement Tracking System
 * Persistent milestone tracking with localStorage
 */

import { ACHIEVEMENT_DEFINITIONS } from "../data/hal-quotes";
import type { Achievement, AchievementProgress } from "../types/easter-eggs";

export class AchievementTracker {
	private progress: AchievementProgress;
	private onUnlock: (achievement: Achievement) => void;

	constructor(onUnlock: (achievement: Achievement) => void) {
		this.onUnlock = onUnlock;
		this.progress = this.loadProgress();
		console.log("🏆 Achievement Tracker Active");
	}

	private loadProgress(): AchievementProgress {
		try {
			const stored = localStorage.getItem("irisAchievements");
			if (stored) {
				return JSON.parse(stored);
			}
		} catch (error) {
			console.error("Failed to load achievements:", error);
		}

		// Initialize default progress
		return {
			clickCount: 0,
			commandCount: 0,
			bookingCount: 0,
			cancelCount: 0,
			sessionStart: Date.now(),
			konamiUnlocked: false,
			achievements: this.initializeAchievements(),
		};
	}

	private initializeAchievements(): Record<string, Achievement> {
		const achievements: Record<string, Achievement> = {};

		for (const def of ACHIEVEMENT_DEFINITIONS) {
			achievements[def.id] = {
				id: def.id,
				name: def.name,
				description: def.description,
				icon: def.icon,
				unlocked: false,
			};
		}

		return achievements;
	}

	private saveProgress(): void {
		try {
			localStorage.setItem("irisAchievements", JSON.stringify(this.progress));
		} catch (error) {
			console.error("Failed to save achievements:", error);
		}
	}

	private checkAchievement(achievementId: string): void {
		const achievement = this.progress.achievements[achievementId];
		if (!achievement || achievement.unlocked) {
			return;
		}

		const definition = ACHIEVEMENT_DEFINITIONS.find(
			(def) => def.id === achievementId,
		);
		if (!definition) return;

		let shouldUnlock = false;

		// Check if requirement is met
		switch (definition.requirement.type) {
			case "click":
				shouldUnlock =
					this.progress.clickCount >= (definition.requirement.count || 0);
				break;
			case "command":
				shouldUnlock =
					this.progress.commandCount >= (definition.requirement.count || 0);
				break;
			case "booking":
				shouldUnlock =
					this.progress.bookingCount >= (definition.requirement.count || 0);
				break;
			case "cancel":
				shouldUnlock =
					this.progress.cancelCount >= (definition.requirement.count || 0);
				break;
			case "konami":
				shouldUnlock = this.progress.konamiUnlocked;
				break;
		}

		if (shouldUnlock) {
			this.unlockAchievement(achievementId);
		}
	}

	private unlockAchievement(achievementId: string): void {
		const achievement = this.progress.achievements[achievementId];
		if (!achievement || achievement.unlocked) {
			return;
		}

		achievement.unlocked = true;
		achievement.unlockedAt = Date.now();

		this.saveProgress();
		this.onUnlock(achievement);

		console.log(`🏆 Achievement Unlocked: ${achievement.name}`);
	}

	// Public tracking methods
	public trackClick(): void {
		this.progress.clickCount++;
		this.saveProgress();
		this.checkAchievement("persistent-clicker");
	}

	public trackCommand(): void {
		this.progress.commandCount++;
		this.saveProgress();
		this.checkAchievement("power-user");
	}

	public trackBooking(): void {
		this.progress.bookingCount++;
		this.saveProgress();
		this.checkAchievement("first-blood");
		this.checkAchievement("booking-spree");
	}

	public trackCancel(): void {
		this.progress.cancelCount++;
		this.saveProgress();
		this.checkAchievement("cancel-culture");
	}

	public trackKonami(): void {
		this.progress.konamiUnlocked = true;
		this.saveProgress();
		this.checkAchievement("konami-master");
	}

	public trackSpecialCommand(command: string): void {
		if (command === "daisy") {
			this.checkAchievement("daisy-fan");
		}
		// Track coffee command frequency
		if (command === "coffee") {
			// Would need separate counter, simplified for now
			this.checkAchievement("caffeine-addict");
		}
	}

	public trackSpecialTime(time: string): void {
		if (time === "333") {
			this.checkAchievement("night-owl");
		}
	}

	public getProgress(): AchievementProgress {
		return this.progress;
	}

	public getUnlockedAchievements(): Achievement[] {
		return Object.values(this.progress.achievements).filter((a) => a.unlocked);
	}

	public getAllAchievements(): Achievement[] {
		return Object.values(this.progress.achievements);
	}

	public resetProgress(): void {
		this.progress = {
			clickCount: 0,
			commandCount: 0,
			bookingCount: 0,
			cancelCount: 0,
			sessionStart: Date.now(),
			konamiUnlocked: false,
			achievements: this.initializeAchievements(),
		};
		this.saveProgress();
	}
}
