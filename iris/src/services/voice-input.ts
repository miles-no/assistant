import type { TerminalSettings } from "../types/terminal";

/**
 * Voice Input Service - Handles speech-to-text functionality
 * Uses Web Speech API for browser-based voice recognition
 */

// Web Speech API types (local definitions for this module)
interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	maxAlternatives: number;
	onresult:
		| ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
		| null;
	onerror:
		| ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
		| null;
	onend: ((this: SpeechRecognition, ev: Event) => any) | null;
	start(): void;
	stop(): void;
}

interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
}

interface SpeechRecognitionResultList {
	[index: number]: SpeechRecognitionResult;
	length: number;
}

interface SpeechRecognitionResult {
	[index: number]: SpeechRecognitionAlternative;
	length: number;
}

interface SpeechRecognitionAlternative {
	transcript: string;
	confidence: number;
}

export class VoiceInputService {
	private recognition: SpeechRecognition | null = null;
	private isListening = false;
	private settings: TerminalSettings;

	constructor(settings: TerminalSettings) {
		this.settings = settings;
		this.initializeRecognition();
	}

	private initializeRecognition() {
		if (!this.settings.voiceInputEnabled) return;

		try {
			// Check for Web Speech API support
			const SpeechRecognition =
				window.SpeechRecognition || window.webkitSpeechRecognition;

			if (!SpeechRecognition) {
				console.warn("Speech recognition not supported in this browser");
				return;
			}

			this.recognition = new SpeechRecognition();
			this.recognition.continuous = false;
			this.recognition.interimResults = false;
			this.recognition.lang = "en-US";
			this.recognition.maxAlternatives = 1;
		} catch (error) {
			console.warn("Failed to initialize speech recognition:", error);
		}
	}

	updateSettings(newSettings: TerminalSettings) {
		this.settings = newSettings;
		if (newSettings.voiceInputEnabled && !this.recognition) {
			this.initializeRecognition();
		}
	}

	async startListening(): Promise<string> {
		if (!this.settings.voiceInputEnabled || !this.recognition) {
			throw new Error("Voice input is disabled or not supported");
		}

		if (this.isListening) {
			throw new Error("Already listening");
		}

		return new Promise((resolve, reject) => {
			if (!this.recognition)
				return reject(new Error("Speech recognition not available"));

			this.recognition.onresult = (event: SpeechRecognitionEvent) => {
				const transcript = event.results[0][0].transcript;
				resolve(transcript);
			};

			this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
				this.isListening = false;
				reject(new Error(`Speech recognition error: ${event.error}`));
			};

			this.recognition.onend = () => {
				this.isListening = false;
			};

			this.recognition.start();
			this.isListening = true;
		});
	}

	stopListening() {
		if (this.recognition && this.isListening) {
			this.recognition.stop();
			this.isListening = false;
		}
	}

	isCurrentlyListening(): boolean {
		return this.isListening;
	}

	isSupported(): boolean {
		return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
	}
}
