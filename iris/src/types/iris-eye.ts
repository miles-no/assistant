/**
 * IRIS Eye state and configuration types
 */

export type IrisEyeState = "idle" | "thinking" | "alert" | "error" | "blinking";

export interface IrisEyeConfig {
	maxMovement: number;
	smoothing: number;
	depthSmoothing: number;
	targetDepth: number;
	currentDepth: number;
}

export interface IrisEyePosition {
	mouseX: number;
	mouseY: number;
	currentX: number;
	currentY: number;
}

export interface IrisEyeInteraction {
	clickCount: number;
	lastClickTime: number;
	isHovering: boolean;
	hoverDepthBoost: number;
	clickRecoilTime: number;
	mouseIdleTimeout: number | null;
	blinkTimeout: number | null;
}

export interface IrisEyeElements {
	eye: HTMLElement;
	iris: HTMLElement;
	pupil: HTMLElement;
}

export type WarningMessage = string;
