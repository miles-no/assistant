// IRIS Eye Tracking & Personality System

class IrisEye {
	constructor() {
		this.eye = document.getElementById("hal-eye");
		this.iris = document.getElementById("iris");
		this.pupil = document.getElementById("pupil");

		this.mouseX = 0;
		this.mouseY = 0;
		this.currentX = 0;
		this.currentY = 0;

		// Depth perception (0 = far away, 1 = close to screen)
		this.targetDepth = 0.5;
		this.currentDepth = 0.5;
		this.depthSmoothing = 0.05;

		this.maxMovement = 8; // Maximum pixels iris can move from center
		this.smoothing = 0.15; // Lower = smoother tracking

		this.state = "idle";
		this.blinkInterval = null;

		// Click reaction tracking
		this.clickCount = 0;
		this.lastClickTime = 0;
		this.isHovering = false;
		this.hoverDepthBoost = 0;
		this.clickRecoilTime = 0;
		this.warningMessages = [
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

		this.init();
	}

	init() {
		// Set initial state
		this.setState("idle");

		// Track mouse movement
		document.addEventListener("mousemove", (e) => this.onMouseMove(e));

		// Add click listener to eye
		this.eye.addEventListener("click", (e) => this.onEyeClick(e));
		this.eye.style.cursor = "pointer";

		// Add hover listeners for anticipation
		this.eye.addEventListener("mouseenter", () => this.onEyeHover(true));
		this.eye.addEventListener("mouseleave", () => this.onEyeHover(false));

		// Start animation loop
		this.animate();

		// Start random blink behavior
		this.startBlinkBehavior();

		console.log("✅ IRIS Eye System Online");
	}

	onMouseMove(e) {
		// Calculate mouse position relative to screen center
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;

		// Normalize to -1 to 1 range
		this.mouseX = (e.clientX - centerX) / centerX;
		this.mouseY = (e.clientY - centerY) / centerY;
	}

	onEyeHover(isEntering) {
		this.isHovering = isEntering;
		console.log(`👁️  IRIS: ${isEntering ? "Hover enter" : "Hover exit"}`);
	}

	onEyeClick(e) {
		e.preventDefault();
		e.stopPropagation();

		const now = Date.now();
		const timeSinceLastClick = now - this.lastClickTime;
		this.lastClickTime = now;

		// Trigger recoil effect (snap back for 300ms)
		this.clickRecoilTime = now + 300;

		// Increment click counter (reset if more than 5 seconds passed)
		if (timeSinceLastClick > 5000) {
			this.clickCount = 1;
		} else {
			this.clickCount++;
		}

		// Choose intensity based on click frequency
		let intensity = "mild";
		if (this.clickCount >= 5) {
			intensity = "extreme";
		} else if (this.clickCount >= 3) {
			intensity = "severe";
		} else if (this.clickCount >= 2) {
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
			`👁️  IRIS: Clicked! Count: ${this.clickCount}, Intensity: ${intensity}, Recoil!`,
		);
	}

	showClickWarning(message, intensity) {
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

	animate() {
		// Smooth interpolation towards mouse position
		const targetX = this.mouseX * this.maxMovement;
		const targetY = this.mouseY * this.maxMovement;

		this.currentX += (targetX - this.currentX) * this.smoothing;
		this.currentY += (targetY - this.currentY) * this.smoothing;

		// Smooth depth interpolation with subtle breathing in idle state
		let adjustedTargetDepth = this.targetDepth;

		// Handle click recoil (snap back)
		const now = Date.now();
		if (now < this.clickRecoilTime) {
			adjustedTargetDepth = 0.2; // Pull way back on click
		}
		// Handle hover anticipation (expand forward)
		else if (this.isHovering && this.state === "idle") {
			adjustedTargetDepth = this.targetDepth + 0.15; // Expand forward by 0.15
		}
		// Normal idle breathing
		else if (this.state === "idle") {
			// Add subtle breathing (sine wave between -0.05 and +0.05)
			const breathingOffset = Math.sin(Date.now() / 3000) * 0.05;
			adjustedTargetDepth = this.targetDepth + breathingOffset;
		}
		// Error state pulsing (more dramatic oscillation)
		else if (this.state === "error") {
			// Add intense pulsing (oscillates between 0.0 and 0.2)
			const errorPulse = Math.sin(Date.now() / 200) * 0.1 + 0.1;
			adjustedTargetDepth = Math.max(0, this.targetDepth + errorPulse);
		}

		this.currentDepth +=
			(adjustedTargetDepth - this.currentDepth) * this.depthSmoothing;

		// Apply transform to iris (makes it "look" at mouse)
		if (this.iris) {
			this.iris.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
		}

		// Apply depth effects to entire eye container
		if (this.eye) {
			// Scale: further away = much smaller, closer = much larger (more extreme)
			const scale = 0.4 + this.currentDepth * 1.2; // 0.4 to 1.6 (was 0.7 to 1.3)

			// Blur: further away = heavy blur (more extreme fog)
			const blur = (1 - this.currentDepth) * 6; // 0 to 6px (was 2px)

			// Opacity: further away = more faded (more extreme)
			const opacity = 0.6 + this.currentDepth * 0.4; // 0.6 to 1.0 (was 0.8 to 1.0)

			// Brightness: darker when far away
			const brightness = 0.7 + this.currentDepth * 0.3; // 0.7 to 1.0

			this.eye.style.transform = `scale(${scale})`;
			this.eye.style.filter = `blur(${blur}px) brightness(${brightness})`;
			this.eye.style.opacity = opacity;
		}

		requestAnimationFrame(() => this.animate());
	}

	setState(newState) {
		if (this.state === newState) return;

		// Remove old state class from eye and body
		this.eye.classList.remove(this.state);
		document.body.classList.remove(`crt-${this.state}`);

		// Add new state class
		this.state = newState;
		this.eye.classList.add(newState);
		document.body.classList.add(`crt-${newState}`);

		// Set depth based on state (more extreme values)
		switch (newState) {
			case "idle":
				this.targetDepth = 0.55; // Normal depth with subtle breathing
				break;
			case "thinking":
				this.targetDepth = 0.1; // Deep retreat (contemplating far away)
				break;
			case "alert":
				this.targetDepth = 1.0; // Maximum forward (right in your face)
				break;
			case "error":
				this.targetDepth = 0.0; // Maximum defensive retreat (into the void)
				break;
			case "blinking":
				// Keep current depth during blink
				break;
		}

		console.log(
			`👁️  IRIS State: ${newState.toUpperCase()} | Depth: ${this.targetDepth}`,
		);
	}

	startBlinkBehavior() {
		const scheduleBlink = () => {
			// Random interval between 3-10 seconds
			const interval = 3000 + Math.random() * 7000;

			this.blinkInterval = setTimeout(() => {
				this.blink();
				scheduleBlink(); // Schedule next blink
			}, interval);
		};

		scheduleBlink();
	}

	blink() {
		// Don't blink if already blinking or in alert/error state
		if (
			this.state === "blinking" ||
			this.state === "alert" ||
			this.state === "error"
		) {
			return;
		}

		const previousState = this.state;
		this.setState("blinking");

		// Return to previous state after blink
		setTimeout(() => {
			this.setState(previousState);
		}, 150);
	}

	// Public methods for external state control
	setIdle() {
		this.setState("idle");
	}

	setThinking() {
		this.setState("thinking");
	}

	setAlert() {
		this.setState("alert");
		// Return to idle after alert animation
		setTimeout(() => {
			if (this.state === "alert") {
				this.setState("idle");
			}
		}, 500);
	}

	setError() {
		this.setState("error");
		// Return to idle after dramatic pause (longer for more impact)
		setTimeout(() => {
			if (this.state === "error") {
				this.setState("idle");
			}
		}, 4000);
	}

	// Manual depth control for dramatic effects
	setDepth(depth) {
		this.targetDepth = Math.max(0, Math.min(1, depth)); // Clamp 0-1
	}
}

// Initialize when DOM is ready
let irisEye;
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		irisEye = new IrisEye();
		window.IrisEye = irisEye;
	});
} else {
	irisEye = new IrisEye();
}

// Export for use in terminal.js
window.IrisEye = irisEye;
