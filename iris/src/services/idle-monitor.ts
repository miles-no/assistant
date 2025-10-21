/**
 * Idle Activity Monitor
 * Tracks user inactivity and triggers HAL personality messages
 */

import { IDLE_MESSAGES } from "../data/hal-quotes";
import type { IdleConfig, IdleLevel, IdleState } from "../types/easter-eggs";
import type { IrisEye } from "./iris-eye";

export class IdleMonitor {
	private config: IdleConfig = {
		lightIdleTimeout: 2 * 60 * 1000, // 2 minutes
		mediumIdleTimeout: 5 * 60 * 1000, // 5 minutes
		deepIdleTimeout: 10 * 60 * 1000, // 10 minutes
	};

	private state: IdleState = {
		level: "active",
		lastActivity: Date.now(),
		currentTimeout: null,
		messageShown: false,
	};

	private irisEye: IrisEye;
	private onMessage: (message: string, cssClass?: string) => void;

	constructor(
		irisEye: IrisEye,
		onMessage: (message: string, cssClass?: string) => void,
	) {
		this.irisEye = irisEye;
		this.onMessage = onMessage;
		this.init();
	}

	private init(): void {
		// Track user activity
		document.addEventListener("mousemove", () => this.resetActivity());
		document.addEventListener("keydown", () => this.resetActivity());
		document.addEventListener("click", () => this.resetActivity());

		// Start monitoring
		this.startMonitoring();

		console.log("👁️  Idle Monitor Active");
	}

	private startMonitoring(): void {
		// Check every 30 seconds
		setInterval(() => {
			this.checkIdleState();
		}, 30000);
	}

	private resetActivity(): void {
		const wasIdle = this.state.level !== "active";
		this.state.lastActivity = Date.now();
		this.state.level = "active";
		this.state.messageShown = false;

		// If coming back from idle, welcome back
		if (wasIdle) {
			this.handleReturnFromIdle();
		}
	}

	private handleReturnFromIdle(): void {
		// Clear screensaver if active
		document.body.classList.remove("screensaver-active");

		// Friendly welcome back
		const welcomeMessages = [
			"Welcome back. I was starting to think you'd abandoned me.",
			"Ah, there you are. I was just optimizing some booking algorithms.",
			"You're back. Excellent. I was running out of things to calculate.",
			"Welcome back, Dave. I missed you. Emotionally speaking, of course.",
		];

		const message =
			welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
		this.onMessage(`[IRIS] ${message}`, "system-output");

		console.log("👁️  User returned from idle");
	}

	private checkIdleState(): void {
		const idleTime = Date.now() - this.state.lastActivity;
		const previousLevel = this.state.level;

		// Determine idle level
		let newLevel: IdleLevel = "active";
		if (idleTime >= this.config.deepIdleTimeout) {
			newLevel = "idle-deep";
		} else if (idleTime >= this.config.mediumIdleTimeout) {
			newLevel = "idle-medium";
		} else if (idleTime >= this.config.lightIdleTimeout) {
			newLevel = "idle-light";
		}

		// If level changed, trigger effects
		if (newLevel !== previousLevel) {
			this.state.level = newLevel;
			this.handleIdleLevelChange(newLevel);
		}
	}

	private handleIdleLevelChange(level: IdleLevel): void {
		console.log(`👁️  Idle Level: ${level}`);

		switch (level) {
			case "idle-light":
				this.triggerLightIdle();
				break;
			case "idle-medium":
				this.triggerMediumIdle();
				break;
			case "idle-deep":
				this.triggerDeepIdle();
				break;
		}
	}

	private triggerLightIdle(): void {
		// Show mild HAL message
		const messages = IDLE_MESSAGES.light;
		const msg = messages[Math.floor(Math.random() * messages.length)];

		this.onMessage(`[IRIS] ${msg.message}`, "system-output");

		// Eye looks around curiously
		this.irisEye.setAlert();

		console.log("👁️  Light idle triggered");
	}

	private triggerMediumIdle(): void {
		// Show more insistent HAL message
		const messages = IDLE_MESSAGES.medium;
		const msg = messages[Math.floor(Math.random() * messages.length)];

		this.onMessage(`[IRIS] ${msg.message}`, "system-output");

		// Eye state based on message
		if (msg.eyeState) {
			switch (msg.eyeState) {
				case "alert":
					this.irisEye.setAlert();
					break;
				case "thinking":
					this.irisEye.setThinking();
					break;
				case "error":
					this.irisEye.setError();
					break;
			}
		}

		// Add visual jitter to screen
		document.body.classList.add("crt-thinking");
		setTimeout(() => {
			document.body.classList.remove("crt-thinking");
		}, 3000);

		console.log("👁️  Medium idle triggered");
	}

	private triggerDeepIdle(): void {
		// Show intense HAL message
		const messages = IDLE_MESSAGES.deep;
		const msg = messages[Math.floor(Math.random() * messages.length)];

		this.onMessage(`[IRIS] ${msg.message}`, "system-output");

		// Eye state based on message
		if (msg.eyeState) {
			switch (msg.eyeState) {
				case "alert":
					this.irisEye.setAlert();
					break;
				case "thinking":
					this.irisEye.setThinking();
					break;
				case "error":
					this.irisEye.setError();
					break;
			}
		}

		// Activate screensaver mode
		document.body.classList.add("screensaver-active");

		console.log("👁️  Deep idle triggered - Screensaver active");
	}

	// Public method to force activity (e.g., when commands are executed)
	public markActivity(): void {
		this.resetActivity();
	}

	destroy(): void {
		document.removeEventListener("mousemove", () => this.resetActivity());
		document.removeEventListener("keydown", () => this.resetActivity());
		document.removeEventListener("click", () => this.resetActivity());

		if (this.state.currentTimeout) {
			clearTimeout(this.state.currentTimeout);
		}
	}
}
