// Global window type extensions for IRIS

import type { IrisEye } from "../services/iris-eye";
import type { LLMHealthService } from "../services/llm-health";

// Web Speech API type definitions
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

declare global {
	interface Window {
		IrisEye: IrisEye;
		LLMHealth: LLMHealthService;
		marked?: {
			setOptions: (options: { breaks?: boolean; gfm?: boolean }) => void;
			parse: (markdown: string) => string;
		};
		// Web Speech API
		SpeechRecognition: {
			new (): SpeechRecognition;
		};
		webkitSpeechRecognition: {
			new (): SpeechRecognition;
		};
		speechSynthesis: SpeechSynthesis;
		SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
	}
}
