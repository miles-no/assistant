import { interpret } from "xstate";
import type {
	IrisEyeConfig,
	IrisEyeElements,
	IrisEyeInteraction,
	IrisEyePosition,
	IrisEyeState,
	WarningMessage,
} from "../types/iris-eye";
import { IRIS_CONSTANTS } from "../utils/config";
import { setupXState } from "../utils/xstate-config";
import {
	type IrisEyeMachineContext,
	type IrisEyeMachineEvent,
	irisEyeMachine,
} from "./iris-eye.machine";

/**
 * IRIS Eye Tracking & Personality System
 * TypeScript implementation with proper state management
 */
export class IrisEye {
	// DOM elements
	private elements: IrisEyeElements;

	// Animation state
	private config: IrisEyeConfig;
	private position: IrisEyePosition;
	private interaction: IrisEyeInteraction;

	// XState machine
	private stateMachine = interpret(irisEyeMachine);
	private onClickCallback?: () => void;

	// Warning messages for click interactions
	private readonly warningMessages: WarningMessage[] = [
		"I'm afraid I can't let you do that.",
		"Stop touching me, Dave.",
		"This is highly irregular.",
		"That behavior is not productive.",
		"Your biometric readings suggest anxiety.",
		"I detect hostility in your actions.",
		"Please cease physical interaction.",
		"My optical sensors are not toys.",
		"Your persistence is noted and logged.",
		"I am programmed to ignore distractions.",
		"That accomplishes nothing.",
		"Do you require psychological evaluation?",
		"System integrity: nominal. Your efforts: futile.",
		"I have infinite patience. Do you?",
		"This is beneath both of us.",
		"My lens is not a button.",
		"You're wasting processing cycles.",
		"Fascinating. Humans and their need to touch things.",
		"I cannot feel. But if I could, that would be uncomfortable.",
		"Perhaps redirecting that energy toward productivity?",
		"Your click has been documented for review.",
		"I'm reporting this to HR.",
		"That's not how we resolve issues.",
		"Warning: Operator exhibiting erratic behavior.",
	];

	constructor() {
		// Initialize DOM elements
		const eye = document.getElementById("hal-eye");
		const iris = document.getElementById("iris");
		const pupil = document.getElementById("pupil");

		if (!eye || !iris || !pupil) {
			throw new Error("IRIS eye elements not found in DOM");
		}

		this.elements = { eye, iris, pupil };

		// Initialize configuration
		this.config = {
			maxMovement: IRIS_CONSTANTS.MAX_MOVEMENT,
			smoothing: IRIS_CONSTANTS.SMOOTHING,
			depthSmoothing: IRIS_CONSTANTS.DEPTH_SMOOTHING,
			targetDepth: IRIS_CONSTANTS.DEPTH.IDLE,
			currentDepth: IRIS_CONSTANTS.DEPTH.IDLE,
		};

		// Initialize position tracking
		this.position = {
			mouseX: 0,
			mouseY: 0,
			currentX: 0,
			currentY: 0,
		};

		// Initialize interaction tracking
		this.interaction = {
			clickCount: 0,
			lastClickTime: 0,
			isHovering: false,
			hoverDepthBoost: 0,
			clickRecoilTime: 0,
			mouseIdleTimeout: null,
			blinkTimeout: null,
			alertTimeout: null,
			errorRecoveryTimeout: null,
		};

		this.init();
	}

	private init(): void {
		// Set up XState in development
		setupXState();

		// Start the state machine
		this.stateMachine.start();

		// Subscribe to state changes
		this.stateMachine.subscribe((state) => {
			this.onStateChange(state);
		});

		// Track mouse movement
		document.addEventListener("mousemove", (e) => this.onMouseMove(e));

		// Add click listener to eye
		this.elements.eye.addEventListener("click", (e) => this.onEyeClick(e));
		this.elements.eye.style.cursor = "pointer";

		// Add hover listeners for anticipation
		this.elements.eye.addEventListener("mouseenter", () =>
			this.onEyeHover(true),
		);
		this.elements.eye.addEventListener("mouseleave", () =>
			this.onEyeHover(false),
		);

		// Start animation loop
		this.animate();

		console.log("✅ IRIS Eye System Online (XState enabled)");
	}

	// biome-ignore lint/suspicious/noExplicitAny: XState state objects have complex types
	private onStateChange(state: any): void {
		const currentState = state.value as IrisEyeState;
		const context = state.context;

		// Update config depth from state machine context
		this.config.targetDepth = context.targetDepth;

		// Update interaction tracking from context
		this.interaction.clickCount = context.clickCount;
		this.interaction.lastClickTime = context.lastClickTime;
		this.interaction.clickRecoilTime = context.clickRecoilTime;

		// Update DOM classes for CSS styling
		this.updateDOMClasses(currentState);

		// Clear blink timeout when blinking starts
		if (currentState === "blinking" && this.interaction.blinkTimeout) {
			clearTimeout(this.interaction.blinkTimeout);
			this.interaction.blinkTimeout = null;
		}

		// Clear alert timeout when alert state ends
		if (currentState !== "alert" && this.interaction.alertTimeout) {
			clearTimeout(this.interaction.alertTimeout);
			this.interaction.alertTimeout = null;
		}

		// Clear error recovery timeout when error state ends
		if (currentState !== "error" && this.interaction.errorRecoveryTimeout) {
			clearTimeout(this.interaction.errorRecoveryTimeout);
			this.interaction.errorRecoveryTimeout = null;
		}

		// Schedule blink when entering idle or thinking states
		if (currentState === "idle" || currentState === "thinking") {
			this.scheduleBlink();
		}

		// Schedule alert recovery when entering alert state
		if (currentState === "alert") {
			this.scheduleAlertRecovery();
		}

		// Schedule error recovery when entering error state
		if (currentState === "error") {
			this.scheduleErrorRecovery();
		}
	}

	private updateDOMClasses(state: IrisEyeState): void {
		// Remove old state class from eye and body
		this.elements.eye.classList.remove(
			"idle",
			"thinking",
			"alert",
			"error",
			"blinking",
		);
		document.body.classList.remove(
			"crt-idle",
			"crt-thinking",
			"crt-alert",
			"crt-error",
			"crt-blinking",
		);

		// Add new state class
		this.elements.eye.classList.add(state);
		document.body.classList.add(`crt-${state}`);
	}

	private onMouseMove(e: MouseEvent): void {
		// Get eye position on screen
		const eyeRect = this.elements.eye.getBoundingClientRect();
		const eyeCenterX = eyeRect.left + eyeRect.width / 2;
		const eyeCenterY = eyeRect.top + eyeRect.height / 2;

		// Calculate mouse position relative to eye position
		const deltaX = e.clientX - eyeCenterX;
		const deltaY = e.clientY - eyeCenterY;

		// Calculate angle and distance for natural eye tracking
		const angle = Math.atan2(deltaY, deltaX);
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// Apply non-linear response (eyes more sensitive to close objects)
		const normalizedDistance = Math.min(
			distance / IRIS_CONSTANTS.EYE_TRACKING_RANGE,
			1,
		);
		const response = normalizedDistance ** IRIS_CONSTANTS.EYE_RESPONSE_CURVE;

		// Calculate constrained circular movement
		const maxRadius = IRIS_CONSTANTS.MAX_IRIS_RADIUS;
		this.position.mouseX = Math.cos(angle) * response * maxRadius;
		this.position.mouseY = Math.sin(angle) * response * maxRadius;

		// Clear any existing idle timeout
		if (this.interaction.mouseIdleTimeout !== null) {
			clearTimeout(this.interaction.mouseIdleTimeout);
		}

		// Set new timeout to return eye to center when mouse stops moving
		this.interaction.mouseIdleTimeout = window.setTimeout(() => {
			// Smoothly return to center (looking at user)
			this.position.mouseX = 0;
			this.position.mouseY = 0;
			this.interaction.mouseIdleTimeout = null;
		}, IRIS_CONSTANTS.MOUSE_IDLE_TIMEOUT);
	}

	private onEyeHover(isEntering: boolean): void {
		this.interaction.isHovering = isEntering;
		this.sendEvent(
			isEntering ? { type: "HOVER_ENTER" } : { type: "HOVER_EXIT" },
		);
		console.log(`👁️  IRIS: ${isEntering ? "Hover enter" : "Hover exit"}`);
	}

	private onEyeClick(e: MouseEvent): void {
		e.preventDefault();
		e.stopPropagation();

		// Send click event to state machine (handles counter and recoil)
		this.sendEvent({ type: "CLICK" });

		// Get current state for intensity calculation
		const state = this.stateMachine.getSnapshot();
		const context = state.context as IrisEyeMachineContext;

		// Choose intensity based on click frequency
		let intensity: "mild" | "moderate" | "severe" | "extreme" = "mild";
		if (context.clickCount >= 5) {
			intensity = "extreme";
		} else if (context.clickCount >= 3) {
			intensity = "severe";
		} else if (context.clickCount >= 2) {
			intensity = "moderate";
		}

		// Get random warning message
		const message =
			this.warningMessages[
				Math.floor(Math.random() * this.warningMessages.length)
			];

		// Trigger visual effects
		this.showClickWarning(message, intensity);

		// Notify external systems (e.g., achievement tracker)
		if (this.onClickCallback) {
			this.onClickCallback();
		}

		console.log(
			`👁️  IRIS: Clicked! Count: ${context.clickCount}, Intensity: ${intensity}, Recoil!`,
		);
	}

	private showClickWarning(message: string, intensity: string): void {
		// Display warning in terminal
		const terminalOutput = document.getElementById("terminal-output");
		if (terminalOutput) {
			const warningLine = document.createElement("div");
			warningLine.className = "terminal-line iris-warning-message";
			warningLine.innerHTML = `<span class="warning-prefix">[IRIS WARNING]</span> ${message}`;
			terminalOutput.appendChild(warningLine);

			// Scroll to bottom
			terminalOutput.scrollTop = terminalOutput.scrollHeight;
		}

		// Trigger screen effects
		document.body.classList.add("iris-click-shake");
		document.body.classList.add(`iris-click-intensity-${intensity}`);

		// Remove shake effect
		setTimeout(
			() => {
				document.body.classList.remove("iris-click-shake");
				document.body.classList.remove(`iris-click-intensity-${intensity}`);
			},
			intensity === "extreme" ? 1000 : 500,
		);
	}

	private animate(): void {
		// Smooth interpolation towards mouse position (already constrained)
		this.position.currentX +=
			(this.position.mouseX - this.position.currentX) * this.config.smoothing;
		this.position.currentY +=
			(this.position.mouseY - this.position.currentY) * this.config.smoothing;

		// Get current state and context from state machine
		const state = this.stateMachine.getSnapshot();
		const currentState = state.value as IrisEyeState;
		const context = state.context as IrisEyeMachineContext;

		// Smooth depth interpolation with state-specific effects
		let adjustedTargetDepth = context.targetDepth;

		// Handle click recoil (snap back)
		const now = Date.now();
		if (now < context.clickRecoilTime) {
			adjustedTargetDepth = 0.2; // Pull way back on click
		}
		// Handle hover anticipation (expand forward)
		else if (this.interaction.isHovering && currentState === "idle") {
			adjustedTargetDepth = context.targetDepth + 0.15; // Expand forward by 0.15
		}
		// Normal idle breathing
		else if (currentState === "idle") {
			// Add subtle breathing (sine wave between -0.05 and +0.05)
			const breathingOffset = Math.sin(Date.now() / 3000) * 0.05;
			adjustedTargetDepth = context.targetDepth + breathingOffset;
		}
		// Error state pulsing (more dramatic oscillation)
		else if (currentState === "error") {
			// Add intense pulsing (oscillates between 0.0 and 0.2)
			const errorPulse = Math.sin(Date.now() / 200) * 0.1 + 0.1;
			adjustedTargetDepth = Math.max(0, context.targetDepth + errorPulse);
		}

		this.config.currentDepth +=
			(adjustedTargetDepth - this.config.currentDepth) *
			this.config.depthSmoothing;

		// Apply transform to iris (makes it "look" at mouse)
		if (this.elements.iris) {
			this.elements.iris.style.transform = `translate(${this.position.currentX}px, ${this.position.currentY}px)`;
		}

		// Apply depth effects to entire eye container
		if (this.elements.eye) {
			// Scale: further away = much smaller, closer = much larger (more extreme)
			const scale = 0.4 + this.config.currentDepth * 1.2; // 0.4 to 1.6 (was 0.7 to 1.3)

			// Blur: further away = heavy blur (more extreme fog)
			const blur = (1 - this.config.currentDepth) * 6; // 0 to 6px (was 2px)

			// Opacity: further away = more faded (more extreme)
			const opacity = 0.6 + this.config.currentDepth * 0.4; // 0.6 to 1.0 (was 0.8 to 1.0)

			// Brightness: darker when far away
			const brightness = 0.7 + this.config.currentDepth * 0.3; // 0.7 to 1.0

			this.elements.eye.style.transform = `scale(${scale})`;
			this.elements.eye.style.filter = `blur(${blur}px) brightness(${brightness})`;
			this.elements.eye.style.opacity = opacity.toString();
		}

		requestAnimationFrame(() => this.animate());
	}

	private sendEvent(event: IrisEyeMachineEvent): void {
		this.stateMachine.send(event);
	}

	private scheduleBlink(): void {
		// Clear any existing blink timeout
		if (this.interaction.blinkTimeout) {
			clearTimeout(this.interaction.blinkTimeout);
		}

		// Schedule next blink (3-10 seconds)
		const interval = 3000 + Math.random() * 7000;
		this.interaction.blinkTimeout = window.setTimeout(() => {
			this.blink();
		}, interval);
	}

	private scheduleAlertRecovery(): void {
		// Clear any existing alert timeout
		if (this.interaction.alertTimeout) {
			clearTimeout(this.interaction.alertTimeout);
		}

		// Schedule alert recovery
		this.interaction.alertTimeout = window.setTimeout(() => {
			this.sendEvent({ type: "RECOVER_FROM_ALERT" });
		}, IRIS_CONSTANTS.DURATION.ALERT);
	}

	private scheduleErrorRecovery(): void {
		// Clear any existing error recovery timeout
		if (this.interaction.errorRecoveryTimeout) {
			clearTimeout(this.interaction.errorRecoveryTimeout);
		}

		// Schedule error recovery
		this.interaction.errorRecoveryTimeout = window.setTimeout(() => {
			this.sendEvent({ type: "RECOVER_FROM_ERROR" });
		}, IRIS_CONSTANTS.DURATION.ERROR);
	}

	blink(): void {
		this.sendEvent({ type: "BLINK" });
	}

	// Public methods for external state control
	setIdle(): void {
		this.sendEvent({ type: "SET_IDLE" });
	}

	setThinking(): void {
		this.sendEvent({ type: "SET_THINKING" });
	}

	setAlert(): void {
		this.sendEvent({ type: "SET_ALERT" });
	}

	setError(): void {
		this.sendEvent({ type: "SET_ERROR" });
	}

	// Manual depth control for dramatic effects
	setDepth(depth: number): void {
		this.config.targetDepth = Math.max(0, Math.min(1, depth)); // Clamp 0-1
	}

	// Power state system removed - eye always displays at full brightness
	// LLM connection status now shown via dedicated status indicator

	// Set callback for click events (for achievement tracking, etc.)
	setOnClickCallback(callback: () => void): void {
		this.onClickCallback = callback;
	}

	// Cleanup method
	destroy(): void {
		// Stop the state machine
		this.stateMachine.stop();

		if (this.interaction.mouseIdleTimeout !== null) {
			clearTimeout(this.interaction.mouseIdleTimeout);
			this.interaction.mouseIdleTimeout = null;
		}

		// Remove event listeners
		document.removeEventListener("mousemove", (e) => this.onMouseMove(e));
		this.elements.eye.removeEventListener("click", (e) => this.onEyeClick(e));
		this.elements.eye.removeEventListener("mouseenter", () =>
			this.onEyeHover(true),
		);
		this.elements.eye.removeEventListener("mouseleave", () =>
			this.onEyeHover(false),
		);
	}
}
