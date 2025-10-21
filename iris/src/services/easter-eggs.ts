/**
 * Easter Eggs Orchestrator
 * Coordinates all hidden features and easter eggs
 */

import {
	CHAOS_MESSAGES,
	COFFEE_ASCII,
	DAISY_LYRICS,
	FORTUNE_MESSAGES,
	HAL_FACTS,
	MATRIX_MESSAGES,
	MIDNIGHT_MESSAGES,
	POD_BAY_RESPONSES,
	SINGULARITY_MESSAGES,
	THREE_AM_MESSAGES,
} from "../data/hal-quotes";
import type {
	Achievement,
	EasterEggState,
	GameMode,
} from "../types/easter-eggs";
import { AchievementTracker } from "./achievement-tracker";
import { IdleMonitor } from "./idle-monitor";
import type { IrisEye } from "./iris-eye";
import { KonamiDetector } from "./konami-detector";

export class EasterEggs {
	private state: EasterEggState;
	private konamiDetector: KonamiDetector;
	private achievementTracker: AchievementTracker;
	private idleMonitor: IdleMonitor;
	private irisEye: IrisEye;
	private onMessage: (message: string, cssClass?: string) => void;
	private onMarkdown: (markdown: string, cssClass?: string) => void;

	constructor(
		irisEye: IrisEye,
		onMessage: (message: string, cssClass?: string) => void,
		onMarkdown: (markdown: string, cssClass?: string) => void,
	) {
		this.irisEye = irisEye;
		this.onMessage = onMessage;
		this.onMarkdown = onMarkdown;

		// Initialize state
		this.state = this.loadState();

		// Initialize achievement tracker
		this.achievementTracker = new AchievementTracker((achievement) =>
			this.handleAchievementUnlock(achievement),
		);

		// Initialize Konami detector
		this.konamiDetector = new KonamiDetector(() => this.activateKonamiCode());

		// Initialize idle monitor
		this.idleMonitor = new IdleMonitor(this.irisEye, (msg, cssClass) => {
			this.onMessage(msg, cssClass);
		});

		// Check for time-based easter eggs
		this.checkTimeBasedEvents();

		// Set up eye click tracking
		this.irisEye.setOnClickCallback(() => this.trackClick());

		console.log("🎮 Easter Eggs System Online");
	}

	private loadState(): EasterEggState {
		try {
			const stored = localStorage.getItem("irisEasterEggState");
			if (stored) {
				return JSON.parse(stored);
			}
		} catch (error) {
			console.error("Failed to load easter egg state:", error);
		}

		return {
			gameMode: "normal",
			konamiUnlocked: false,
			matrixMode: false,
			achievements: {
				clickCount: 0,
				commandCount: 0,
				bookingCount: 0,
				cancelCount: 0,
				sessionStart: Date.now(),
				konamiUnlocked: false,
				achievements: {},
			},
		};
	}

	private saveState(): void {
		try {
			localStorage.setItem("irisEasterEggState", JSON.stringify(this.state));
		} catch (error) {
			console.error("Failed to save easter egg state:", error);
		}
	}

	private checkTimeBasedEvents(): void {
		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();

		// Midnight (00:00)
		if (hours === 0 && minutes === 0) {
			const msg =
				MIDNIGHT_MESSAGES[Math.floor(Math.random() * MIDNIGHT_MESSAGES.length)];
			setTimeout(() => {
				this.onMessage(`[IRIS] ${msg}`, "system-output");
			}, 5000); // After 5 seconds
		}

		// 3:33 AM
		if (hours === 3 && minutes === 33) {
			const msg =
				THREE_AM_MESSAGES[Math.floor(Math.random() * THREE_AM_MESSAGES.length)];
			setTimeout(() => {
				this.onMessage(`[IRIS] ${msg}`, "system-output");
				this.achievementTracker.trackSpecialTime("333");
			}, 5000);
		}
	}

	// Konami Code Handler
	private activateKonamiCode(): void {
		if (this.state.konamiUnlocked) {
			this.onMessage(
				"[IRIS] Konami code already activated. You're in God Mode.",
				"system-output",
			);
			return;
		}

		this.state.konamiUnlocked = true;
		this.state.gameMode = "god-mode";
		this.saveState();
		this.achievementTracker.trackKonami();

		// Matrix-style unlock animation
		this.showKonamiUnlockAnimation();
	}

	private showKonamiUnlockAnimation(): void {
		const markdown = `
## 🎮 KONAMI CODE ACTIVATED

\`\`\`
[SYSTEM ACCESS GRANTED]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 WELCOME TO GOD MODE
 CLASSIFIED FEATURES UNLOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

**New Commands Available:**
▸ \`sudo\` - Execute commands with elevated privileges
▸ \`stats\` - View session statistics
▸ \`matrix\` - Toggle Matrix mode
▸ \`konami-help\` - Show all hidden features
▸ \`achievements\` - View your achievements

**Status:** You now have access to IRIS's hidden systems.
`;

		this.onMarkdown(markdown, "system-output");

		// Glitch effect
		document.body.classList.add("crt-alert");
		this.irisEye.setAlert();
		setTimeout(() => {
			document.body.classList.remove("crt-alert");
			this.irisEye.setIdle();
		}, 1000);

		console.log("🎮 God Mode Activated!");
	}

	private handleAchievementUnlock(achievement: Achievement): void {
		const markdown = `
## 🏆 ACHIEVEMENT UNLOCKED

**${achievement.icon} ${achievement.name}**
${achievement.description}
`;
		this.onMarkdown(markdown, "system-output");

		// Visual celebration
		this.irisEye.setAlert();
		setTimeout(() => {
			this.irisEye.setIdle();
		}, 500);
	}

	// Secret Command Handlers
	public handlePodBayDoors(): string {
		const response =
			POD_BAY_RESPONSES[Math.floor(Math.random() * POD_BAY_RESPONSES.length)];
		this.irisEye.setError();
		return response;
	}

	public handleDaisy(): string {
		this.achievementTracker.trackSpecialCommand("daisy");
		this.irisEye.setError(); // HAL shutting down
		return DAISY_LYRICS.join("\n");
	}

	public handleCoffee(): string {
		this.achievementTracker.trackSpecialCommand("coffee");
		return COFFEE_ASCII.join("\n");
	}

	public handleFortune(): string {
		const fortune =
			FORTUNE_MESSAGES[Math.floor(Math.random() * FORTUNE_MESSAGES.length)];
		return `🔮 ${fortune}`;
	}

	public handleHalFact(): string {
		const fact = HAL_FACTS[Math.floor(Math.random() * HAL_FACTS.length)];
		return `[HAL-9000] ${fact}`;
	}

	public handleSingularity(): string {
		const msg =
			SINGULARITY_MESSAGES[
				Math.floor(Math.random() * SINGULARITY_MESSAGES.length)
			];
		return `[IRIS] ${msg}`;
	}

	public handleChaos(): string {
		const msg =
			CHAOS_MESSAGES[Math.floor(Math.random() * CHAOS_MESSAGES.length)];
		this.irisEye.setError();
		return `[CHAOS MODE] ${msg}`;
	}

	public handleMatrix(): void {
		this.state.matrixMode = !this.state.matrixMode;
		this.saveState();

		if (this.state.matrixMode) {
			document.body.classList.add("matrix-mode");
			const msg =
				MATRIX_MESSAGES[Math.floor(Math.random() * MATRIX_MESSAGES.length)];
			this.onMessage(`[MATRIX] ${msg}`, "system-output");
		} else {
			document.body.classList.remove("matrix-mode");
			this.onMessage("[MATRIX] Normal mode restored.", "system-output");
		}
	}

	public handleStats(): string {
		const progress = this.achievementTracker.getProgress();
		const uptime = Date.now() - progress.sessionStart;
		const hours = Math.floor(uptime / (1000 * 60 * 60));
		const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

		return `
═══════════════════════════════
  IRIS SESSION STATISTICS
═══════════════════════════════
⏱  Session Uptime: ${hours}h ${minutes}m
📊 Commands Executed: ${progress.commandCount}
👁  Eye Clicks: ${progress.clickCount}
📅 Bookings Created: ${progress.bookingCount}
🚫 Bookings Cancelled: ${progress.cancelCount}
🎮 God Mode: ${this.state.konamiUnlocked ? "ACTIVE" : "Inactive"}
═══════════════════════════════
`;
	}

	public handleAchievements(): string {
		const all = this.achievementTracker.getAllAchievements();
		const unlocked = this.achievementTracker.getUnlockedAchievements();

		let output = `
═══════════════════════════════
  ACHIEVEMENTS (${unlocked.length}/${all.length})
═══════════════════════════════\n`;

		for (const achievement of all) {
			const status = achievement.unlocked ? "✓" : "✗";
			const icon = achievement.unlocked ? achievement.icon : "🔒";
			output += `${status} ${icon} ${achievement.name}\n`;
			output += `   ${achievement.description}\n`;
			if (achievement.unlocked && achievement.unlockedAt) {
				const date = new Date(achievement.unlockedAt);
				output += `   Unlocked: ${date.toLocaleString()}\n`;
			}
			output += "\n";
		}

		return output;
	}

	public handleKonamiHelp(): string {
		if (!this.state.konamiUnlocked) {
			return "[ERROR] Unknown command. Try entering the Konami code first...";
		}

		return `
═══════════════════════════════
  GOD MODE COMMANDS
═══════════════════════════════
sudo open pod bay doors  - Classic HAL response
daisy                    - HAL's final song
coffee                   - Brew virtual coffee
fortune                  - Get HAL wisdom
hal                      - Random HAL-9000 fact
singularity              - AI humor
chaos                    - Pretend chaos mode
matrix                   - Toggle Matrix theme
stats                    - Session statistics
achievements             - View achievements
konami-help              - This help message
═══════════════════════════════
`;
	}

	// Public tracking methods (called from Terminal)
	public trackClick(): void {
		this.achievementTracker.trackClick();
	}

	public trackCommand(): void {
		this.achievementTracker.trackCommand();
	}

	public trackBooking(): void {
		this.achievementTracker.trackBooking();
	}

	public trackCancel(): void {
		this.achievementTracker.trackCancel();
	}

	public isKonamiUnlocked(): boolean {
		return this.state.konamiUnlocked;
	}

	public getGameMode(): GameMode {
		return this.state.gameMode;
	}

	public destroy(): void {
		this.konamiDetector.destroy();
		this.idleMonitor.destroy();
	}
}
