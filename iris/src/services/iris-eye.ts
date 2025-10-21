import type {
	IrisEyeConfig,
	IrisEyeElements,
	IrisEyeInteraction,
	IrisEyePosition,
	IrisEyeState,
	WarningMessage,
} from "../types/iris-eye";
import { IRIS_CONSTANTS } from "../utils/config";

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

	// State management
	private currentState: IrisEyeState = "idle";
	private blinkInterval: number | null = null;

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
		};

		this.init();
	}

	private init(): void {
		// Set initial state
		this.setState("idle");

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

		// Start random blink behavior
		this.startBlinkBehavior();

		console.log("✅ IRIS Eye System Online");
	}

	private onMouseMove(e: MouseEvent): void {
		// Get eye position on screen
		const eyeRect = this.elements.eye.getBoundingClientRect();
		const eyeCenterX = eyeRect.left + eyeRect.width / 2;
		const eyeCenterY = eyeRect.top + eyeRect.height / 2;

		// Calculate mouse position relative to eye position
		const deltaX = e.clientX - eyeCenterX;
		const deltaY = e.clientY - eyeCenterY;

		// Normalize based on screen dimensions for consistent range
		const maxDistance = Math.max(window.innerWidth, window.innerHeight);
		this.position.mouseX = (deltaX / maxDistance) * 2;
		this.position.mouseY = (deltaY / maxDistance) * 2;

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
		console.log(`👁️  IRIS: ${isEntering ? "Hover enter" : "Hover exit"}`);
	}

	private onEyeClick(e: MouseEvent): void {
		e.preventDefault();
		e.stopPropagation();

		const now = Date.now();
		const timeSinceLastClick = now - this.interaction.lastClickTime;
		this.interaction.lastClickTime = now;

		// Trigger recoil effect (snap back for 300ms)
		this.interaction.clickRecoilTime = now + 300;

		// Increment click counter (reset if more than 5 seconds passed)
		if (timeSinceLastClick > 5000) {
			this.interaction.clickCount = 1;
		} else {
			this.interaction.clickCount++;
		}

		// Choose intensity based on click frequency
		let intensity: "mild" | "moderate" | "severe" | "extreme" = "mild";
		if (this.interaction.clickCount >= 5) {
			intensity = "extreme";
		} else if (this.interaction.clickCount >= 3) {
			intensity = "severe";
		} else if (this.interaction.clickCount >= 2) {
			intensity = "moderate";
		}

		// Get random warning message
		const message =
			this.warningMessages[
				Math.floor(Math.random() * this.warningMessages.length)
			];

		// Trigger visual effects
		this.showClickWarning(message, intensity);

		// Set IRIS to error state temporarily
		this.setError();

		console.log(
			`👁️  IRIS: Clicked! Count: ${this.interaction.clickCount}, Intensity: ${intensity}, Recoil!`,
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
		// Smooth interpolation towards mouse position
		const targetX = this.position.mouseX * this.config.maxMovement;
		const targetY = this.position.mouseY * this.config.maxMovement;

		this.position.currentX +=
			(targetX - this.position.currentX) * this.config.smoothing;
		this.position.currentY +=
			(targetY - this.position.currentY) * this.config.smoothing;

		// Smooth depth interpolation with subtle breathing in idle state
		let adjustedTargetDepth = this.config.targetDepth;

		// Handle click recoil (snap back)
		const now = Date.now();
		if (now < this.interaction.clickRecoilTime) {
			adjustedTargetDepth = 0.2; // Pull way back on click
		}
		// Handle hover anticipation (expand forward)
		else if (this.interaction.isHovering && this.currentState === "idle") {
			adjustedTargetDepth = this.config.targetDepth + 0.15; // Expand forward by 0.15
		}
		// Normal idle breathing
		else if (this.currentState === "idle") {
			// Add subtle breathing (sine wave between -0.05 and +0.05)
			const breathingOffset = Math.sin(Date.now() / 3000) * 0.05;
			adjustedTargetDepth = this.config.targetDepth + breathingOffset;
		}
		// Error state pulsing (more dramatic oscillation)
		else if (this.currentState === "error") {
			// Add intense pulsing (oscillates between 0.0 and 0.2)
			const errorPulse = Math.sin(Date.now() / 200) * 0.1 + 0.1;
			adjustedTargetDepth = Math.max(0, this.config.targetDepth + errorPulse);
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

	private setState(newState: IrisEyeState): void {
		if (this.currentState === newState) return;

		// Remove old state class from eye and body
		this.elements.eye.classList.remove(this.currentState);
		document.body.classList.remove(`crt-${this.currentState}`);

		// Add new state class
		this.currentState = newState;
		this.elements.eye.classList.add(newState);
		document.body.classList.add(`crt-${newState}`);

		// Set depth based on state (more extreme values)
		switch (newState) {
			case "idle":
				this.config.targetDepth = IRIS_CONSTANTS.DEPTH.IDLE; // Normal depth with subtle breathing
				break;
			case "thinking":
				this.config.targetDepth = IRIS_CONSTANTS.DEPTH.THINKING; // Deep retreat (contemplating far away)
				break;
			case "alert":
				this.config.targetDepth = IRIS_CONSTANTS.DEPTH.ALERT; // Maximum forward (right in your face)
				break;
			case "error":
				this.config.targetDepth = IRIS_CONSTANTS.DEPTH.ERROR; // Maximum defensive retreat (into the void)
				break;
			case "blinking":
				// Keep current depth during blink
				break;
		}

		console.log(
			`👁️  IRIS State: ${newState.toUpperCase()} | Depth: ${this.config.targetDepth}`,
		);
	}

	private startBlinkBehavior(): void {
		const scheduleBlink = () => {
			// Random interval between 3-10 seconds
			const interval = 3000 + Math.random() * 7000;

			this.blinkInterval = window.setTimeout(() => {
				this.blink();
				scheduleBlink(); // Schedule next blink
			}, interval);
		};

		scheduleBlink();
	}

	blink(): void {
		// Don't blink if already blinking or in alert/error state
		if (
			this.currentState === "blinking" ||
			this.currentState === "alert" ||
			this.currentState === "error"
		) {
			return;
		}

		const previousState = this.currentState;
		this.setState("blinking");

		// Return to previous state after blink
		setTimeout(() => {
			this.setState(previousState);
		}, IRIS_CONSTANTS.DURATION.BLINK);
	}

	// Public methods for external state control
	setIdle(): void {
		this.setState("idle");
	}

	setThinking(): void {
		this.setState("thinking");
	}

	setAlert(): void {
		this.setState("alert");
		// Return to idle after alert animation
		setTimeout(() => {
			if (this.currentState === "alert") {
				this.setState("idle");
			}
		}, IRIS_CONSTANTS.DURATION.ALERT);
	}

	setError(): void {
		this.setState("error");
		// Return to idle after dramatic pause (longer for more impact)
		setTimeout(() => {
			if (this.currentState === "error") {
				this.setState("idle");
			}
		}, IRIS_CONSTANTS.DURATION.ERROR);
	}

	// Manual depth control for dramatic effects
	setDepth(depth: number): void {
		this.config.targetDepth = Math.max(0, Math.min(1, depth)); // Clamp 0-1
	}

	// Power state system removed - eye always displays at full brightness
	// LLM connection status now shown via dedicated status indicator

	// Cleanup method
	destroy(): void {
		if (this.blinkInterval) {
			clearTimeout(this.blinkInterval);
			this.blinkInterval = null;
		}

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
