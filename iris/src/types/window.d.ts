// Global window type extensions for IRIS

import type { IrisEye } from "../services/iris-eye";
import type { LLMHealthService } from "../services/llm-health";

declare global {
	interface Window {
		IrisEye: IrisEye;
		LLMHealth: LLMHealthService;
		marked?: {
			setOptions: (options: { breaks?: boolean; gfm?: boolean }) => void;
			parse: (markdown: string) => string;
		};
	}
}
