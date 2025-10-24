import { assign, createMachine } from "xstate";
import type { IrisEyeState } from "../types/iris-eye";
import { IRIS_CONSTANTS } from "../utils/config";
import { logActionExecution, logStateTransition } from "../utils/xstate-config";

/**
 * Context for IRIS Eye state machine
 */
export interface IrisEyeMachineContext {
	// Animation state
	targetDepth: number;
	currentDepth: number;

	// Interaction tracking
	clickCount: number;
	lastClickTime: number;
	clickRecoilTime: number;

	// Blink behavior
	blinkTimeoutId: number | null;
	lastBlinkTime: number;
	previousState: string; // Track previous state for blink recovery

	// Error recovery
	errorRecoveryTimeoutId: number | null;

	// Alert timeout
	alertTimeoutId: number | null;
}

/**
 * Persisted state (subset of context that should survive page refresh)
 */
export interface IrisEyePersistedState {
	clickCount: number;
	lastClickTime: number;
	lastBlinkTime: number;
}

/**
 * Storage key for IRIS Eye state
 */
const IRIS_EYE_STORAGE_KEY = "iris-eye-state";

/**
 * Load persisted state from localStorage
 */
export function loadPersistedState(): Partial<IrisEyePersistedState> {
	try {
		const stored = localStorage.getItem(IRIS_EYE_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as IrisEyePersistedState;
			// Validate the data
			if (
				typeof parsed.clickCount === "number" &&
				typeof parsed.lastClickTime === "number" &&
				typeof parsed.lastBlinkTime === "number"
			) {
				return parsed;
			}
		}
	} catch (error) {
		console.warn("Failed to load IRIS Eye persisted state:", error);
	}
	return {};
}

/**
 * Save state to localStorage
 */
export function savePersistedState(state: IrisEyePersistedState): void {
	try {
		localStorage.setItem(IRIS_EYE_STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.warn("Failed to save IRIS Eye state:", error);
	}
}

/**
 * Clear persisted state
 */
export function clearPersistedState(): void {
	try {
		localStorage.removeItem(IRIS_EYE_STORAGE_KEY);
	} catch (error) {
		console.warn("Failed to clear IRIS Eye state:", error);
	}
}

/**
 * Events for IRIS Eye state machine
 */
export type IrisEyeMachineEvent =
	| { type: "SET_IDLE" }
	| { type: "SET_THINKING" }
	| { type: "SET_ALERT" }
	| { type: "SET_ERROR" }
	| { type: "BLINK" }
	| { type: "BLINK_COMPLETE" }
	| { type: "CLICK" }
	| { type: "HOVER_ENTER" }
	| { type: "HOVER_EXIT" }
	| { type: "RECOVER_FROM_ERROR" }
	| { type: "RECOVER_FROM_ALERT" }
	| { type: "SCHEDULE_BLINK" };

/**
 * IRIS Eye State Machine
 * Manages the 5 discrete states: idle, thinking, alert, error, blinking
 */
export const irisEyeMachine = createMachine<
	IrisEyeMachineContext,
	IrisEyeMachineEvent
>(
	{
		id: "irisEye",
		initial: "idle",

		context: () => {
			// Load persisted state
			const persisted = loadPersistedState();

			return {
				targetDepth: IRIS_CONSTANTS.DEPTH.IDLE,
				currentDepth: IRIS_CONSTANTS.DEPTH.IDLE,
				clickCount: persisted.clickCount ?? 0,
				lastClickTime: persisted.lastClickTime ?? 0,
				clickRecoilTime: 0,
				blinkTimeoutId: null,
				lastBlinkTime: persisted.lastBlinkTime ?? 0,
				previousState: "idle",
				errorRecoveryTimeoutId: null,
				alertTimeoutId: null,
			};
		},

		states: {
			idle: {
				entry: ["setIdleDepth", "logStateEntry", "scheduleBlink"],
				exit: ["clearBlinkTimeout"],
				on: {
					SET_THINKING: "thinking",
					SET_ALERT: "alert",
					SET_ERROR: "error",
					BLINK: {
						target: "blinking",
						cond: "canBlink",
					},
					CLICK: {
						actions: ["handleClick", "triggerError"],
					},
				},
			},

			thinking: {
				entry: ["setThinkingDepth", "logStateEntry"],
				on: {
					SET_IDLE: "idle",
					SET_ALERT: "alert",
					SET_ERROR: "error",
					BLINK: {
						target: "blinking",
						cond: "canBlink",
					},
					CLICK: {
						actions: ["handleClick", "triggerError"],
					},
				},
			},

			alert: {
				entry: ["setAlertDepth", "logStateEntry", "scheduleAlertRecovery"],
				exit: ["clearAlertTimeout"],
				on: {
					SET_IDLE: "idle",
					SET_THINKING: "thinking",
					SET_ERROR: "error",
					RECOVER_FROM_ALERT: "idle",
					// Prevent blinking during alert
					BLINK: undefined,
					CLICK: {
						actions: ["handleClick", "triggerError"],
					},
				},
			},

			error: {
				entry: ["setErrorDepth", "logStateEntry", "scheduleErrorRecovery"],
				exit: ["clearErrorTimeout"],
				on: {
					SET_IDLE: "idle",
					SET_THINKING: "thinking",
					SET_ALERT: "alert",
					RECOVER_FROM_ERROR: "idle",
					// Prevent blinking during error
					BLINK: undefined,
					CLICK: {
						actions: ["handleClick", "triggerError"],
					},
				},
			},

			blinking: {
				entry: ["logStateEntry"],
				after: {
					[IRIS_CONSTANTS.DURATION.BLINK]: [
						{ target: "idle", cond: "wasIdleBeforeBlink" },
						{ target: "thinking", cond: "wasThinkingBeforeBlink" },
						{ target: "alert", cond: "wasAlertBeforeBlink" },
						{ target: "error", cond: "wasErrorBeforeBlink" },
					],
				},
			},
		},

		on: {
			HOVER_ENTER: {
				actions: ["handleHoverEnter"],
			},
			HOVER_EXIT: {
				actions: ["handleHoverExit"],
			},
			SCHEDULE_BLINK: {
				actions: ["scheduleBlink"],
			},
		},
	},
	{
		guards: {
			canBlink: (_context, _event, meta) => {
				const state = meta.state;
				// Cannot blink if already blinking or in alert/error state
				return state.matches("idle") || state.matches("thinking");
			},

			wasIdleBeforeBlink: (context, _event, _meta) => {
				return context.previousState === "idle";
			},

			wasThinkingBeforeBlink: (context, _event, _meta) => {
				return context.previousState === "thinking";
			},

			wasAlertBeforeBlink: (context, _event, _meta) => {
				return context.previousState === "alert";
			},

			wasErrorBeforeBlink: (context, _event, _meta) => {
				return context.previousState === "error";
			},
		},

		actions: {
			logStateEntry: (_context, event, meta) => {
				const stateId = meta.state.value as IrisEyeState;
				logStateTransition("irisEye", "previous", stateId, event.type);
			},

			setIdleDepth: assign({
				targetDepth: IRIS_CONSTANTS.DEPTH.IDLE,
				previousState: "idle",
			}),

			setThinkingDepth: assign({
				targetDepth: IRIS_CONSTANTS.DEPTH.THINKING,
				previousState: "thinking",
			}),

			setAlertDepth: assign({
				targetDepth: IRIS_CONSTANTS.DEPTH.ALERT,
				previousState: "alert",
			}),

			setErrorDepth: assign({
				targetDepth: IRIS_CONSTANTS.DEPTH.ERROR,
				previousState: "error",
			}),

			handleClick: assign((context, _event) => {
				const now = Date.now();
				const timeSinceLastClick = now - context.lastClickTime;

				// Increment click counter (reset if more than 5 seconds passed)
				const newClickCount =
					timeSinceLastClick > 5000 ? 1 : context.clickCount + 1;

				logActionExecution("irisEye", "handleClick", {
					clickCount: newClickCount,
				});

				// Save persisted state
				savePersistedState({
					clickCount: newClickCount,
					lastClickTime: now,
					lastBlinkTime: context.lastBlinkTime,
				});

				return {
					clickCount: newClickCount,
					lastClickTime: now,
					clickRecoilTime: now + 300, // 300ms recoil
				};
			}),

			triggerError: (_context, _event) => {
				logActionExecution("irisEye", "triggerError");
				// This will be handled by the state transition to error
			},

			handleHoverEnter: (_context, _event) => {
				logActionExecution("irisEye", "handleHoverEnter");
				// Hover effects handled in animation loop
			},

			handleHoverExit: (_context, _event) => {
				logActionExecution("irisEye", "handleHoverExit");
				// Hover effects handled in animation loop
			},

			scheduleBlink: assign((context, _event) => {
				// Clear existing timeout
				if (context.blinkTimeoutId) {
					clearTimeout(context.blinkTimeoutId);
				}

				// Calculate next blink interval (3-10 seconds)
				const interval = 3000 + Math.random() * 7000;

				logActionExecution("irisEye", "scheduleBlink", { interval });

				// Only update lastBlinkTime if it's 0 (uninitialized), preserve persisted values
				const now = Date.now();
				const shouldUpdateBlinkTime = context.lastBlinkTime === 0;

				// Note: Actual timeout scheduling is handled in the service layer
				// to avoid memory leaks and allow proper event sending
				if (shouldUpdateBlinkTime) {
					return {
						lastBlinkTime: now,
					};
				} else {
					return {};
				}
			}),

			clearBlinkTimeout: assign((context) => {
				if (context.blinkTimeoutId) {
					clearTimeout(context.blinkTimeoutId);
					logActionExecution("irisEye", "clearBlinkTimeout");
				}
				return {
					blinkTimeoutId: null,
				};
			}),

			scheduleAlertRecovery: assign((_context) => {
				const timeoutId = window.setTimeout(() => {
					// This would need to be sent as an event
				}, IRIS_CONSTANTS.DURATION.ALERT);

				logActionExecution("irisEye", "scheduleAlertRecovery");

				return {
					alertTimeoutId: timeoutId,
				};
			}),

			clearAlertTimeout: assign((context) => {
				if (context.alertTimeoutId) {
					clearTimeout(context.alertTimeoutId);
					logActionExecution("irisEye", "clearAlertTimeout");
				}
				return {
					alertTimeoutId: null,
				};
			}),

			scheduleErrorRecovery: assign((_context) => {
				const timeoutId = window.setTimeout(() => {
					// This would need to be sent as an event
				}, IRIS_CONSTANTS.DURATION.ERROR);

				logActionExecution("irisEye", "scheduleErrorRecovery");

				return {
					errorRecoveryTimeoutId: timeoutId,
				};
			}),

			clearErrorTimeout: assign((context) => {
				if (context.errorRecoveryTimeoutId) {
					clearTimeout(context.errorRecoveryTimeoutId);
					logActionExecution("irisEye", "clearErrorRecovery");
				}
				return {
					errorRecoveryTimeoutId: null,
				};
			}),
		},
	},
);
