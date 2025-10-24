import { interpret } from "xstate";
import { setupXState } from "../utils/xstate-config";
import type { User } from "./api-client";
import {
	type TerminalContext,
	type TerminalEvent,
	type TerminalStateValue,
	terminalStateMachine,
} from "./terminal-state.machine";

/**
 * Terminal State Manager
 * Manages overall terminal state using XState
 */
export class TerminalStateManager {
	private stateMachine = interpret(terminalStateMachine);
	private listeners: Set<
		(state: TerminalStateValue, context: TerminalContext) => void
	> = new Set();

	constructor() {
		this.initialize();
	}

	private initialize(): void {
		// Set up XState in development
		setupXState();

		// Start the state machine
		this.stateMachine.start();

		// Subscribe to state changes
		this.stateMachine.subscribe((state) => {
			const currentState = state.value as TerminalStateValue;
			const context = state.context as TerminalContext;

			// Notify listeners
			this.listeners.forEach((listener) => {
				listener(currentState, context);
			});
		});

		// Initialize the state machine
		this.stateMachine.send({ type: "INITIALIZE" });
	}

	// Public interface
	public login(email: string, password: string): void {
		this.stateMachine.send({
			type: "LOGIN_START",
			email,
			password,
		});
	}

	public loginSuccess(token: string, user: User): void {
		this.stateMachine.send({
			type: "LOGIN_SUCCESS",
			token,
			user,
		});
	}

	public loginFailure(error: string): void {
		this.stateMachine.send({
			type: "LOGIN_FAILURE",
			error,
		});
	}

	public logout(): void {
		this.stateMachine.send({ type: "LOGOUT" });
	}

	public startDemo(): void {
		this.stateMachine.send({ type: "START_DEMO" });
	}

	public stopDemo(): void {
		this.stateMachine.send({ type: "STOP_DEMO" });
	}

	public updateSettings(settings: Partial<TerminalContext["settings"]>): void {
		this.stateMachine.send({
			type: "UPDATE_SETTINGS",
			settings,
		});
	}

	public settingsUpdated(): void {
		this.stateMachine.send({ type: "SETTINGS_UPDATED" });
	}

	public settingsError(error: string): void {
		this.stateMachine.send({
			type: "SETTINGS_ERROR",
			error,
		});
	}

	public updateLLMHealth(
		status: "connected" | "disconnected" | "unknown",
	): void {
		// LLM health affects routing decisions, but doesn't change terminal state directly
		// This could be used for status indicators or routing preferences
		console.log(`TerminalStateManager: LLM health updated to ${status}`);
	}

	public sessionError(error: string): void {
		this.stateMachine.send({
			type: "SESSION_ERROR",
			error,
		});
	}

	public resetError(): void {
		this.stateMachine.send({ type: "RESET_ERROR" });
	}

	// State queries
	public getCurrentState(): TerminalStateValue {
		return this.stateMachine.getSnapshot().value as TerminalStateValue;
	}

	public getContext(): TerminalContext {
		return this.stateMachine.getSnapshot().context as TerminalContext;
	}

	public isAuthenticated(): boolean {
		const state = this.getCurrentState();
		return (
			state === "authenticated" ||
			(typeof state === "object" && "authenticated" in state)
		);
	}

	public isDemoMode(): boolean {
		return this.getContext().isDemoMode;
	}

	public getCurrentUser(): User | null {
		return this.getContext().currentUser;
	}

	public getAuthToken(): string | null {
		return this.getContext().authToken;
	}

	public getSettings() {
		return this.getContext().settings;
	}

	public hasError(): boolean {
		const context = this.getContext();
		return !!(
			context.authError ||
			context.sessionError ||
			context.settingsError
		);
	}

	public getError(): string | null {
		const context = this.getContext();
		return (
			context.lastError ||
			context.authError ||
			context.sessionError ||
			context.settingsError ||
			null
		);
	}

	// Event subscription
	public subscribe(
		listener: (state: TerminalStateValue, context: TerminalContext) => void,
	): () => void {
		this.listeners.add(listener);

		// Return unsubscribe function
		return () => {
			this.listeners.delete(listener);
		};
	}

	public destroy(): void {
		this.listeners.clear();
		this.stateMachine.stop();
	}
}
