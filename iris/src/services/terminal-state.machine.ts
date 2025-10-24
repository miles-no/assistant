import { assign, createMachine } from "xstate";
import { logActionExecution, logStateTransition } from "../utils/xstate-config";
import type { User } from "./api-client";

/**
 * Terminal State Machine
 * Manages overall terminal state including authentication, session, and settings
 */

export type TerminalStateValue =
	| "initializing"
	| "unauthenticated"
	| "authenticating"
	| "authenticated"
	| "demo_mode"
	| "error";

export interface TerminalContext {
	// Authentication
	authToken: string | null;
	currentUser: User | null;
	authError: string | null;

	// Session
	isDemoMode: boolean;
	sessionError: string | null;

	// Settings
	settings: {
		useSimpleNLP: boolean;
		useLLM: boolean;
	};
	settingsError: string | null;

	// General
	lastError: string | null;
	isInitialized: boolean;
}

export type TerminalEvent =
	| { type: "INITIALIZE" }
	| { type: "LOGIN_START"; email: string; password: string }
	| { type: "LOGIN_SUCCESS"; token: string; user: User }
	| { type: "LOGIN_FAILURE"; error: string }
	| { type: "LOGOUT" }
	| { type: "START_DEMO" }
	| { type: "STOP_DEMO" }
	| { type: "UPDATE_SETTINGS"; settings: Partial<TerminalContext["settings"]> }
	| { type: "SETTINGS_UPDATED" }
	| { type: "SETTINGS_ERROR"; error: string }
	| { type: "SESSION_ERROR"; error: string }
	| { type: "RESET_ERROR" };

export const terminalStateMachine = createMachine<
	TerminalContext,
	TerminalEvent
>(
	{
		id: "terminal",
		initial: "initializing",

		context: {
			authToken: null,
			currentUser: null,
			authError: null,
			isDemoMode: false,
			sessionError: null,
			settings: {
				useSimpleNLP: false,
				useLLM: true,
			},
			settingsError: null,
			lastError: null,
			isInitialized: false,
		},

		states: {
			initializing: {
				entry: ["logStateEntry", "loadPersistedState"],
				on: {
					INITIALIZE: {
						target: "unauthenticated",
						actions: ["markInitialized"],
					},
				},
			},

			unauthenticated: {
				entry: ["logStateEntry", "clearAuthState"],
				on: {
					LOGIN_START: {
						target: "authenticating",
						actions: ["setAuthenticating"],
					},
				},
			},

			authenticating: {
				entry: ["logStateEntry"],
				on: {
					LOGIN_SUCCESS: {
						target: "authenticated",
						actions: ["setAuthenticated", "persistAuthState"],
					},
					LOGIN_FAILURE: {
						target: "unauthenticated",
						actions: ["setAuthError"],
					},
				},
			},

			authenticated: {
				entry: ["logStateEntry"],
				initial: "ready",
				states: {
					ready: {
						on: {
							START_DEMO: {
								target: "demo_mode",
								actions: ["setDemoMode"],
							},
							LOGOUT: {
								target: "#terminal.unauthenticated",
								actions: ["clearAuthState", "persistAuthState"],
							},
							UPDATE_SETTINGS: {
								target: "updating_settings",
								actions: ["updateSettings"],
							},
							SESSION_ERROR: {
								target: "error",
								actions: ["setSessionError"],
							},
						},
					},

					demo_mode: {
						on: {
							STOP_DEMO: {
								target: "ready",
								actions: ["clearDemoMode"],
							},
							LOGOUT: {
								target: "#terminal.unauthenticated",
								actions: ["clearAuthState", "persistAuthState"],
							},
						},
					},

					updating_settings: {
						on: {
							SETTINGS_UPDATED: {
								target: "ready",
								actions: ["persistSettings"],
							},
							SETTINGS_ERROR: {
								target: "ready",
								actions: ["setSettingsError"],
							},
						},
					},

					error: {
						on: {
							RESET_ERROR: {
								target: "ready",
								actions: ["clearSessionError"],
							},
							LOGOUT: {
								target: "#terminal.unauthenticated",
								actions: ["clearAuthState", "persistAuthState"],
							},
						},
					},
				},
			},
		},

		on: {
			LOGOUT: {
				target: "unauthenticated",
				actions: ["clearAuthState", "persistAuthState"],
			},
		},
	},
	{
		guards: {},

		actions: {
			logStateEntry: (_context, event, meta) => {
				const stateId = meta.state.value as TerminalStateValue;
				logStateTransition("terminal", "previous", stateId, event.type);
			},

			loadPersistedState: assign((context) => {
				try {
					const authToken = localStorage.getItem("irisAuthToken");
					const userJson = localStorage.getItem("irisUser");
					const settingsJson = localStorage.getItem("irisSettings");

					let currentUser = null;
					if (userJson) {
						currentUser = JSON.parse(userJson) as User;
					}

					let settings = context.settings;
					if (settingsJson) {
						settings = { ...settings, ...JSON.parse(settingsJson) };
					}

					logActionExecution("terminal", "loadPersistedState", {
						hasToken: !!authToken,
						hasUser: !!currentUser,
					});

					return {
						authToken,
						currentUser,
						settings,
					};
				} catch (error) {
					console.error("Failed to load persisted state:", error);
					return {};
				}
			}),

			markInitialized: assign({
				isInitialized: true,
			}),

			setAuthenticating: assign({
				authError: null,
			}),

			setAuthenticated: assign((_context, event) => {
				if (event.type === "LOGIN_SUCCESS") {
					logActionExecution("terminal", "setAuthenticated", {
						userId: event.user.id,
						userRole: event.user.role,
					});

					return {
						authToken: event.token,
						currentUser: event.user,
						authError: null,
					};
				}
				return {};
			}),

			setAuthError: assign((_context, event) => {
				if (event.type === "LOGIN_FAILURE") {
					return {
						authError: event.error,
						authToken: null,
						currentUser: null,
					};
				}
				return {};
			}),

			clearAuthState: assign({
				authToken: null,
				currentUser: null,
				authError: null,
			}),

			persistAuthState: (context) => {
				try {
					if (context.authToken && context.currentUser) {
						localStorage.setItem("irisAuthToken", context.authToken);
						localStorage.setItem(
							"irisUser",
							JSON.stringify(context.currentUser),
						);
					} else {
						localStorage.removeItem("irisAuthToken");
						localStorage.removeItem("irisUser");
					}

					logActionExecution("terminal", "persistAuthState", {
						hasToken: !!context.authToken,
						hasUser: !!context.currentUser,
					});
				} catch (error) {
					console.error("Failed to persist auth state:", error);
				}
			},

			setDemoMode: assign({
				isDemoMode: true,
			}),

			clearDemoMode: assign({
				isDemoMode: false,
			}),

			updateSettings: assign((context, event) => {
				if (event.type === "UPDATE_SETTINGS") {
					const newSettings = { ...context.settings, ...event.settings };
					logActionExecution("terminal", "updateSettings", {
						oldSettings: context.settings,
						newSettings,
					});
					return {
						settings: newSettings,
						settingsError: null,
					};
				}
				return {};
			}),

			persistSettings: (context) => {
				try {
					localStorage.setItem(
						"irisSettings",
						JSON.stringify(context.settings),
					);
					logActionExecution("terminal", "persistSettings", {
						settings: context.settings,
					});
				} catch (error) {
					console.error("Failed to persist settings:", error);
				}
			},

			setSettingsError: assign((_context, event) => {
				if (event.type === "SETTINGS_ERROR") {
					return {
						settingsError: event.error,
					};
				}
				return {};
			}),

			setSessionError: assign((_context, event) => {
				if (event.type === "SESSION_ERROR") {
					return {
						sessionError: event.error,
						lastError: event.error,
					};
				}
				return {};
			}),

			clearSessionError: assign({
				sessionError: null,
				lastError: null,
			}),
		},
	},
);
