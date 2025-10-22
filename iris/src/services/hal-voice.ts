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

		// Configure HAL-9000 voice characteristics
		this.settings.voiceOutputRate = 0.9; // Slightly slower for authority
		this.settings.voiceOutputPitch = 0.8; // Lower pitch for male sound
		this.settings.voiceOutputVolume = 0.8; // Good volume

		// Always set up the voices changed listener
		this.synth.onvoiceschanged = () => {
			this.selectHALVoice();
		};

		// Try to select voice immediately (in case voices are already loaded)
		this.selectHALVoice();

		// If no voices yet, they'll be selected when onvoiceschanged fires
	}

	private selectHALVoice() {
		if (!this.settings.voiceOutputEnabled) return;

		const voices = this.synth.getVoices();
		console.log(`Available voices: ${voices.length}`);
		voices.forEach((voice, index) => {
			console.log(
				`  ${index}: ${voice.name} (${voice.lang}) - ${voice.voiceURI}`,
			);
		});

		// Prefer British English male voices for HAL-9000 personality
		this.voice =
			// Look for voices that might sound authoritative/male
			voices.find(
				(voice) =>
					voice.lang.startsWith("en-GB") &&
					(voice.name.toLowerCase().includes("male") ||
						voice.name.toLowerCase().includes("daniel") ||
						voice.name.toLowerCase().includes("arthur") ||
						voice.name.toLowerCase().includes("alex") ||
						!voice.name.toLowerCase().includes("female")),
			) ||
			// Fallback to any British English voice
			voices.find((voice) => voice.lang.startsWith("en-GB")) ||
			// Fallback to any English male-sounding voice
			voices.find(
				(voice) =>
					voice.lang.startsWith("en") &&
					(voice.name.toLowerCase().includes("male") ||
						voice.name.toLowerCase().includes("alex") ||
						voice.name.toLowerCase().includes("daniel")),
			) ||
			// Fallback to any English voice
			voices.find((voice) => voice.lang.startsWith("en")) ||
			// Last resort: any available voice
			voices[0] ||
			null;

		if (this.voice) {
			console.log(
				`HAL Voice selected: ${this.voice.name} (${this.voice.lang})`,
			);
		} else {
			console.warn(
				"No suitable voice found for HAL-9000 - voice output disabled",
			);
		}
	}

	updateSettings(newSettings: TerminalSettings) {
		this.settings = newSettings;
		if (newSettings.voiceOutputEnabled) {
			this.selectHALVoice();
		}
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

	getCurrentVoice(): SpeechSynthesisVoice | null {
		return this.voice;
	}

	/**
	 * Manually refresh voice selection (useful for debugging)
	 */
	refreshVoices(): void {
		this.selectHALVoice();
	}
}
