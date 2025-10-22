import type { TerminalSettings } from "../types/terminal";

/**
 * HAL Voice Service - Handles text-to-speech with HAL-9000 characteristics
 * Uses Web Speech API Synthesis for HAL-9000 voice output
 */
export class HALVoiceService {
	private synth: SpeechSynthesis;
	private voice: SpeechSynthesisVoice | null = null;
	private settings: TerminalSettings;
	private isSpeaking = false;

	constructor(settings: TerminalSettings) {
		this.synth = window.speechSynthesis;
		this.settings = settings;
		this.selectHALVoice();

		// Load voices when available (may not be immediate)
		if (this.synth.getVoices().length === 0) {
			this.synth.onvoiceschanged = () => {
				this.selectHALVoice();
			};
		}
	}

	private selectHALVoice() {
		if (!this.settings.voiceOutputEnabled) return;

		const voices = this.synth.getVoices();

		// Prefer British English male voice for HAL-9000
		this.voice =
			voices.find(
				(voice) =>
					voice.lang.startsWith("en-GB") &&
					voice.name.toLowerCase().includes("male"),
			) ||
			// Fallback to any British English voice
			voices.find((voice) => voice.lang.startsWith("en-GB")) ||
			// Final fallback to any English voice
			voices.find((voice) => voice.lang.startsWith("en-")) ||
			// Last resort: any available voice
			voices[0] ||
			null;

		if (this.voice) {
			console.log(
				`HAL Voice selected: ${this.voice.name} (${this.voice.lang})`,
			);
		} else {
			console.warn("No suitable voice found for HAL-9000");
		}
	}

	updateSettings(newSettings: TerminalSettings) {
		this.settings = newSettings;
		this.selectHALVoice();
	}

	speak(text: string, onEnd?: () => void) {
		if (!this.settings.voiceOutputEnabled || !this.voice) {
			onEnd?.();
			return;
		}

		// Stop any current speech
		this.stop();

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.voice = this.voice;
		utterance.rate = this.settings.voiceOutputRate;
		utterance.pitch = this.settings.voiceOutputPitch;
		utterance.volume = this.settings.voiceOutputVolume;

		utterance.onend = () => {
			this.isSpeaking = false;
			onEnd?.();
		};

		utterance.onerror = (event) => {
			console.error("Speech synthesis error:", event.error);
			this.isSpeaking = false;
			onEnd?.();
		};

		this.synth.speak(utterance);
		this.isSpeaking = true;
	}

	stop() {
		if (this.isSpeaking) {
			this.synth.cancel();
			this.isSpeaking = false;
		}
	}

	isCurrentlySpeaking(): boolean {
		return this.isSpeaking;
	}

	isSupported(): boolean {
		return "speechSynthesis" in window;
	}

	getAvailableVoices(): SpeechSynthesisVoice[] {
		return this.synth.getVoices();
	}
}
