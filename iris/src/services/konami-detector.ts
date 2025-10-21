/**
 * Konami Code Detector
 * ↑ ↑ ↓ ↓ ← → ← → B A
 */

import type { KonamiCallback } from "../types/easter-eggs";

export class KonamiDetector {
	private sequence: string[] = [
		"ArrowUp",
		"ArrowUp",
		"ArrowDown",
		"ArrowDown",
		"ArrowLeft",
		"ArrowRight",
		"ArrowLeft",
		"ArrowRight",
		"b",
		"a",
	];
	private userInput: string[] = [];
	private callback: KonamiCallback;
	private resetTimeout: number | null = null;

	constructor(callback: KonamiCallback) {
		this.callback = callback;
		this.init();
	}

	private init(): void {
		document.addEventListener("keydown", (e) => this.handleKeyPress(e));
		console.log("🎮 Konami Code Detector Active");
	}

	private handleKeyPress(e: KeyboardEvent): void {
		// Don't capture keys when typing in input fields
		if (
			e.target instanceof HTMLInputElement ||
			e.target instanceof HTMLTextAreaElement
		) {
			return;
		}

		const key = e.key;

		// Add to sequence
		this.userInput.push(key);

		// Keep only last N keys (length of konami code)
		if (this.userInput.length > this.sequence.length) {
			this.userInput.shift();
		}

		// Check if sequence matches
		if (this.checkSequence()) {
			console.log("🎮 KONAMI CODE ACTIVATED!");
			this.callback();
			this.userInput = []; // Reset
		}

		// Reset sequence after 2 seconds of inactivity
		if (this.resetTimeout) {
			clearTimeout(this.resetTimeout);
		}
		this.resetTimeout = window.setTimeout(() => {
			this.userInput = [];
		}, 2000);
	}

	private checkSequence(): boolean {
		if (this.userInput.length !== this.sequence.length) {
			return false;
		}

		return this.sequence.every((key, index) => key === this.userInput[index]);
	}

	destroy(): void {
		document.removeEventListener("keydown", (e) => this.handleKeyPress(e));
		if (this.resetTimeout) {
			clearTimeout(this.resetTimeout);
		}
	}
}
