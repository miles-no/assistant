/**
 * Easter Egg System Types
 * For IRIS's hidden features and personality system
 */

export type IdleLevel = "active" | "idle-light" | "idle-medium" | "idle-deep";

export type GameMode = "normal" | "god-mode" | "matrix" | "legacy";

export interface IdleConfig {
	lightIdleTimeout: number; // 2 minutes
	mediumIdleTimeout: number; // 5 minutes
	deepIdleTimeout: number; // 10 minutes
}

export interface IdleState {
	level: IdleLevel;
	lastActivity: number;
	currentTimeout: number | null;
	messageShown: boolean;
}

export interface Achievement {
	id: string;
	name: string;
	description: string;
	unlocked: boolean;
	unlockedAt?: number;
	icon: string;
}

export interface AchievementProgress {
	clickCount: number;
	commandCount: number;
	bookingCount: number;
	cancelCount: number;
	sessionStart: number;
	konamiUnlocked: boolean;
	achievements: Record<string, Achievement>;
}

export interface EasterEggState {
	gameMode: GameMode;
	konamiUnlocked: boolean;
	matrixMode: boolean;
	achievements: AchievementProgress;
}

export interface HALMessage {
	message: string;
	intensity: "mild" | "medium" | "severe";
	eyeState?: "idle" | "thinking" | "alert" | "error";
}

export type KonamiCallback = () => void;
