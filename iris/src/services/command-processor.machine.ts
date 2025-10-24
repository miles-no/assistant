import { assign, createMachine } from "xstate";
import type { ParsedIntent } from "../utils/natural-language";
import { logActionExecution, logStateTransition } from "../utils/xstate-config";
import type { LLMIntent } from "./llm-service";

/**
 * Command processing states
 */
export type CommandProcessingState =
	| "idle"
	| "parsing"
	| "routing"
	| "executing_builtin"
	| "executing_direct"
	| "executing_nlp"
	| "executing_llm"
	| "error"
	| "fallback";

/**
 * Context for command processing state machine
 */
export interface CommandProcessorContext {
	// Current command being processed
	command: string;
	commandParts: string[];
	mainCommand: string;

	// Parsing results
	parsedIntent?: ParsedIntent;
	llmIntent?: LLMIntent;

	// Execution state
	isExecuting: boolean;
	executionStartTime: number;
	retryCount: number;

	// Error handling
	lastError?: Error;
	errorMessage?: string;

	// Settings and health status
	settings: {
		useSimpleNLP: boolean;
		useLLM: boolean;
	};
	llmHealthStatus: "connected" | "disconnected" | "unknown";

	// Command history for undo operations
	lastExecutedCommand?: string;
	canUndo: boolean;
}

/**
 * Events for command processing state machine
 */
export type CommandProcessorEvent =
	| { type: "PROCESS_COMMAND"; command: string }
	| { type: "COMMAND_PARSED"; intent: ParsedIntent }
	| { type: "LLM_PARSED"; intent: LLMIntent }
	| { type: "EXECUTE_BUILTIN" }
	| { type: "EXECUTE_DIRECT_API" }
	| { type: "EXECUTE_NLP" }
	| { type: "EXECUTE_LLM" }
	| { type: "EXECUTION_SUCCESS" }
	| { type: "EXECUTION_ERROR"; error: Error }
	| { type: "RETRY_COMMAND" }
	| { type: "FALLBACK_TO_NLP" }
	| { type: "FALLBACK_TO_LLM" }
	| { type: "COMMAND_COMPLETE" }
	| {
			type: "UPDATE_SETTINGS";
			settings: { useSimpleNLP: boolean; useLLM: boolean };
	  }
	| {
			type: "UPDATE_LLM_HEALTH";
			status: "connected" | "disconnected" | "unknown";
	  }
	| { type: "RESET" };

/**
 * Command Processing State Machine
 * Handles the complex routing logic for command execution
 */
export const commandProcessorMachine = createMachine<
	CommandProcessorContext,
	CommandProcessorEvent
>(
	{
		id: "commandProcessor",
		initial: "idle",

		context: {
			command: "",
			commandParts: [],
			mainCommand: "",
			isExecuting: false,
			executionStartTime: 0,
			retryCount: 0,
			settings: {
				useSimpleNLP: false,
				useLLM: true,
			},
			llmHealthStatus: "unknown",
			canUndo: false,
		},

		states: {
			idle: {
				entry: ["logStateEntry", "resetContext"],
				on: {
					PROCESS_COMMAND: {
						target: "parsing",
						actions: ["setCommand", "logCommandReceived"],
					},
				},
			},

			parsing: {
				entry: ["logStateEntry", "parseCommand"],
				on: {
					COMMAND_PARSED: [
						{
							target: "routing",
							actions: ["setParsedIntent"],
						},
					],
					EXECUTION_ERROR: {
						target: "error",
						actions: ["setError"],
					},
				},
			},

			routing: {
				entry: ["logStateEntry"],
				on: {
					EXECUTE_BUILTIN: "executing_builtin",
					EXECUTE_DIRECT_API: "executing_direct",
					EXECUTE_NLP: {
						target: "executing_nlp",
						cond: "shouldUseNLP",
					},
					EXECUTE_LLM: {
						target: "executing_llm",
						cond: "shouldUseLLM",
					},
					FALLBACK_TO_NLP: {
						target: "executing_nlp",
						cond: "canUseNLP",
					},
					FALLBACK_TO_LLM: {
						target: "executing_llm",
						cond: "canUseLLM",
					},
					EXECUTION_ERROR: {
						target: "error",
						actions: ["setError"],
					},
				},
			},

			executing_builtin: {
				entry: ["logStateEntry", "startExecution"],
				exit: ["endExecution"],
				on: {
					EXECUTION_SUCCESS: {
						target: "idle",
						actions: ["markCommandComplete", "enableUndo"],
					},
					EXECUTION_ERROR: {
						target: "error",
						actions: ["setError"],
					},
				},
			},

			executing_direct: {
				entry: ["logStateEntry", "startExecution"],
				exit: ["endExecution"],
				on: {
					EXECUTION_SUCCESS: {
						target: "idle",
						actions: ["markCommandComplete", "enableUndo"],
					},
					EXECUTION_ERROR: {
						target: "error",
						actions: ["setError"],
					},
				},
			},

			executing_nlp: {
				entry: ["logStateEntry", "startExecution"],
				exit: ["endExecution"],
				on: {
					EXECUTION_SUCCESS: {
						target: "idle",
						actions: ["markCommandComplete", "enableUndo"],
					},
					EXECUTION_ERROR: [
						{
							target: "fallback",
							cond: "canFallbackToLLM",
							actions: ["setError"],
						},
						{
							target: "error",
							actions: ["setError"],
						},
					],
				},
			},

			executing_llm: {
				entry: ["logStateEntry", "startExecution"],
				exit: ["endExecution"],
				on: {
					EXECUTION_SUCCESS: {
						target: "idle",
						actions: ["markCommandComplete", "enableUndo"],
					},
					EXECUTION_ERROR: [
						{
							target: "fallback",
							cond: "canFallbackToNLP",
							actions: ["setError"],
						},
						{
							target: "error",
							actions: ["setError"],
						},
					],
					// Stay in executing_llm state until async operation completes
				},
			},

			fallback: {
				entry: ["logStateEntry", "logFallbackAttempt"],
				on: {
					EXECUTE_NLP: "executing_nlp",
					EXECUTE_LLM: "executing_llm",
					EXECUTION_ERROR: {
						target: "error",
						actions: ["setError"],
					},
				},
			},

			error: {
				entry: ["logStateEntry", "logError"],
				on: {
					RETRY_COMMAND: [
						{
							target: "parsing",
							cond: "canRetry",
							actions: ["incrementRetryCount"],
						},
						{
							target: "error",
							actions: ["setError", "logMaxRetriesReached"],
						},
					],
					RESET: "idle",
				},
			},
		},

		on: {
			UPDATE_SETTINGS: {
				actions: ["updateSettings"],
			},
			UPDATE_LLM_HEALTH: {
				actions: ["updateLLMHealth"],
			},
			RESET: {
				target: "idle",
				actions: ["resetContext"],
			},
		},
	},
	{
		guards: {
			shouldUseNLP: (context, _event) => {
				const intent = context.parsedIntent;
				return (
					context.settings.useSimpleNLP &&
					intent !== undefined &&
					// High confidence check would go here
					true // Simplified for now
				);
			},

			shouldUseLLM: (context, _event) => {
				return (
					context.settings.useLLM &&
					// LLM routing logic would go here
					true // Simplified for now - allow LLM even if health unknown
				);
			},

			canUseNLP: (context, _event) => {
				return context.settings.useSimpleNLP;
			},

			canUseLLM: (context, _event) => {
				return (
					context.settings.useLLM && context.llmHealthStatus === "connected"
				);
			},

			canFallbackToLLM: (context, _event) => {
				return (
					context.settings.useLLM && context.llmHealthStatus === "connected"
				);
			},

			canFallbackToNLP: (context, _event) => {
				return context.settings.useSimpleNLP;
			},

			canRetry: (context, _event) => {
				return context.retryCount < 3; // Max 3 retries
			},
		},

		actions: {
			logStateEntry: (_context, event, meta) => {
				const stateId = meta.state.value as CommandProcessingState;
				logStateTransition("commandProcessor", "previous", stateId, event.type);
			},

			resetContext: assign({
				command: "",
				commandParts: [],
				mainCommand: "",
				parsedIntent: undefined,
				llmIntent: undefined,
				isExecuting: false,
				executionStartTime: 0,
				retryCount: 0,
				lastError: undefined,
				errorMessage: undefined,
			}),

			setCommand: assign((_context, event) => {
				if (event.type === "PROCESS_COMMAND") {
					const command = event.command.trim();
					const parts = command.split(/\s+/);
					const mainCommand = parts[0].toLowerCase();

					return {
						command,
						commandParts: parts,
						mainCommand,
					};
				}
				return {};
			}),

			logCommandReceived: (context, _event) => {
				logActionExecution("commandProcessor", "processCommand", {
					command: context.command,
					mainCommand: context.mainCommand,
				});
			},

			parseCommand: (context, _event) => {
				logActionExecution("commandProcessor", "parseCommand", {
					command: context.command,
				});
				// Parsing logic will be handled by the service layer
			},

			setParsedIntent: assign((_context, event) => {
				if (event.type === "COMMAND_PARSED") {
					return {
						parsedIntent: event.intent,
					};
				}
				return {};
			}),

			startExecution: assign((context, _event) => {
				logActionExecution("commandProcessor", "startExecution", {
					command: context.command,
				});
				return {
					isExecuting: true,
					executionStartTime: Date.now(),
				};
			}),

			endExecution: assign((context, _event) => {
				const executionTime = Date.now() - context.executionStartTime;
				logActionExecution("commandProcessor", "endExecution", {
					executionTime,
				});
				return {
					isExecuting: false,
					executionStartTime: 0,
				};
			}),

			markCommandComplete: assign((context, _event) => {
				logActionExecution("commandProcessor", "commandComplete", {
					command: context.command,
				});
				return {
					lastExecutedCommand: context.command,
				};
			}),

			enableUndo: assign({
				canUndo: true,
			}),

			setError: assign((_context, event) => {
				if (event.type === "EXECUTION_ERROR") {
					return {
						lastError: event.error,
						errorMessage: event.error.message,
					};
				}
				return {};
			}),

			incrementRetryCount: assign((context, _event) => {
				return {
					retryCount: context.retryCount + 1,
				};
			}),

			logFallbackAttempt: (context, _event) => {
				logActionExecution("commandProcessor", "fallbackAttempt", {
					from: context.lastError?.message,
				});
			},

			logError: (context, _event) => {
				logActionExecution("commandProcessor", "error", {
					error: context.lastError?.message,
					retryCount: context.retryCount,
				});
			},

			logMaxRetriesReached: (context, _event) => {
				logActionExecution("commandProcessor", "maxRetriesReached", {
					command: context.command,
					retryCount: context.retryCount,
				});
			},

			updateSettings: assign((_context, event) => {
				if (event.type === "UPDATE_SETTINGS") {
					logActionExecution("commandProcessor", "updateSettings", {
						settings: event.settings,
					});
					return {
						settings: event.settings,
					};
				}
				return {};
			}),

			updateLLMHealth: assign((_context, event) => {
				if (event.type === "UPDATE_LLM_HEALTH") {
					logActionExecution("commandProcessor", "updateLLMHealth", {
						status: event.status,
					});
					return {
						llmHealthStatus: event.status,
					};
				}
				return {};
			}),
		},
	},
);
