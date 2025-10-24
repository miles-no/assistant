import { afterEach, beforeEach, beforeEach, describe, describe, expect, expect, it, it, vi, vi } from "vitest";
import { interpret } from "xstate";
import {
	clearPersistedState,
	type IrisEyeMachineContext,
	irisEyeMachine,
	loadPersistedState,
	savePersistedState,
} from "./iris-eye.machine";

// Use the global localStorage mock from setup.ts

describe("IRIS Eye State Machine", () => {
	let stateMachine: ReturnType<typeof interpret<typeof irisEyeMachine>>;

	beforeEach(() => {
		// Clear all mocks
		vi.clearAllMocks();

		// Reset localStorage mock
		(global.localStorage.getItem as any).mockReturnValue(null);
		(global.localStorage.setItem as any).mockImplementation(() => {});
		(global.localStorage.removeItem as any).mockImplementation(() => {});

		// Create fresh state machine instance
		stateMachine = interpret(irisEyeMachine);
	});

	afterEach(() => {
		stateMachine.stop();
	});

	describe("Initial State", () => {
		it("should start in idle state", () => {
			stateMachine.start();
			const state = stateMachine.getSnapshot();

			expect((state as any).matches("idle")).toBe(true);
		});

		it("should load persisted state on initialization", () => {
			const mockPersistedState = {
				clickCount: 5,
				lastClickTime: 1234567890,
				lastBlinkTime: 1234567800,
			};
			(global.localStorage.getItem as any).mockReturnValue(
				JSON.stringify(mockPersistedState),
			);

			// Create new machine instance to test context initialization
			const machineWithPersistence = interpret(irisEyeMachine);
			machineWithPersistence.start();
			const state = machineWithPersistence.getSnapshot();

			expect((state.context as IrisEyeMachineContext).clickCount).toBe(5);
			expect((state.context as IrisEyeMachineContext).lastClickTime).toBe(
				1234567890,
			);
			expect((state.context as IrisEyeMachineContext).lastBlinkTime).toBe(
				1234567800,
			);

			machineWithPersistence.stop();
		});

		it("should handle corrupted persisted state gracefully", () => {
			(global.localStorage.getItem as any).mockReturnValue("invalid json");

			const machineWithBadPersistence = interpret(irisEyeMachine);
			machineWithBadPersistence.start();
			const state = machineWithBadPersistence.getSnapshot();

			// Should fall back to defaults
			expect((state.context as IrisEyeMachineContext).clickCount).toBe(0);
			expect((state.context as IrisEyeMachineContext).lastClickTime).toBe(0);
			// lastBlinkTime will be set by scheduleBlink during initialization
			expect(
				(state.context as IrisEyeMachineContext).lastBlinkTime,
			).toBeGreaterThan(0);

			machineWithBadPersistence.stop();
		});
	});

	describe("State Transitions", () => {
		beforeEach(() => {
			stateMachine.start();
		});

		afterEach(() => {
			stateMachine.stop();
		});

		it("should transition from idle to thinking", () => {
			stateMachine.send({ type: "SET_THINKING" });
			const state = stateMachine.getSnapshot();

			expect((state as any).matches("thinking")).toBe(true);
		});

		it("should transition from idle to alert", () => {
			stateMachine.send({ type: "SET_ALERT" });
			const state = stateMachine.getSnapshot();

			expect(state.matches("alert")).toBe(true);
		});

		it("should transition from idle to error", () => {
			stateMachine.send({ type: "SET_ERROR" });
			const state = stateMachine.getSnapshot();

			expect(state.matches("error")).toBe(true);
		});

		it("should handle click events and update context", () => {
			const initialState = stateMachine.getSnapshot();
			const initialClickCount = initialState.context.clickCount;

			stateMachine.send({ type: "CLICK" });
			const state = stateMachine.getSnapshot();

			expect(state.context.clickCount).toBe(initialClickCount + 1);
			expect(state.context.lastClickTime).toBeGreaterThan(0);
			expect(state.context.clickRecoilTime).toBeGreaterThan(0);

			// Should have saved to localStorage
			expect(global.localStorage.setItem).toHaveBeenCalledWith(
				"iris-eye-state",
				expect.stringContaining('"clickCount"'),
			);
		});

		it("should reset click count after 5 seconds", () => {
			// Set up initial state with old click
			stateMachine = interpret(
				irisEyeMachine.withContext({
					...irisEyeMachine.context,
					clickCount: 3,
					lastClickTime: Date.now() - 6000, // 6 seconds ago
				}),
			);
			stateMachine.start();

			stateMachine.send({ type: "CLICK" });
			const state = stateMachine.getSnapshot();

			expect(state.context.clickCount).toBe(1); // Should reset to 1
		});

		it("should handle blink events when in valid states", () => {
			// Mock setTimeout to execute immediately for testing
			vi.useFakeTimers();

			// Should blink from idle
			stateMachine.send({ type: "BLINK" });
			expect(stateMachine.getSnapshot().matches("blinking")).toBe(true);

			// Fast-forward time to complete blink
			vi.advanceTimersByTime(300);
			expect(stateMachine.getSnapshot().matches("idle")).toBe(true);

			vi.useRealTimers();
		});

		it("should prevent blinking in alert state", () => {
			stateMachine.send({ type: "SET_ALERT" });
			stateMachine.send({ type: "BLINK" });

			// Should still be in alert state
			expect(stateMachine.getSnapshot().matches("alert")).toBe(true);
		});

		it("should prevent blinking in error state", () => {
			stateMachine.send({ type: "SET_ERROR" });
			stateMachine.send({ type: "BLINK" });

			// Should still be in error state
			expect(stateMachine.getSnapshot().matches("error")).toBe(true);
		});
	});

	describe("Persistence Functions", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("should load valid persisted state", () => {
			const mockData = {
				clickCount: 10,
				lastClickTime: 1234567890,
				lastBlinkTime: 1234567800,
			};
			(global.localStorage.getItem as any).mockReturnValue(
				JSON.stringify(mockData),
			);

			const result = loadPersistedState();

			expect(result.clickCount).toBe(10);
			expect(result.lastClickTime).toBe(1234567890);
			expect(result.lastBlinkTime).toBe(1234567800);
		});

		it("should return empty object for invalid data", () => {
			(global.localStorage.getItem as any).mockReturnValue("invalid");

			const result = loadPersistedState();

			expect(result).toEqual({});
		});

		it("should return empty object when localStorage throws", () => {
			(global.localStorage.getItem as any).mockImplementation(() => {
				throw new Error("localStorage error");
			});

			const result = loadPersistedState();

			expect(result).toEqual({});
		});

		it("should save state to localStorage", () => {
			const state = {
				clickCount: 5,
				lastClickTime: 1234567890,
				lastBlinkTime: 1234567800,
			};

			savePersistedState(state);

			expect(global.localStorage.setItem).toHaveBeenCalledWith(
				"iris-eye-state",
				JSON.stringify(state),
			);
		});

		it("should handle localStorage save errors gracefully", () => {
			(global.localStorage.setItem as any).mockImplementation(() => {
				throw new Error("localStorage error");
			});

			const state = {
				clickCount: 5,
				lastClickTime: 1234567890,
				lastBlinkTime: 1234567800,
			};

			// Should not throw
			expect(() => savePersistedState(state)).not.toThrow();
		});

		it("should clear persisted state", () => {
			clearPersistedState();

			expect(global.localStorage.removeItem).toHaveBeenCalledWith(
				"iris-eye-state",
			);
		});

		it("should handle localStorage clear errors gracefully", () => {
			(global.localStorage.removeItem as any).mockImplementation(() => {
				throw new Error("localStorage error");
			});

			// Should not throw
			expect(() => clearPersistedState()).not.toThrow();
		});
	});

	describe("Hover Events", () => {
		beforeEach(() => {
			stateMachine.start();
		});

		afterEach(() => {
			stateMachine.stop();
		});

		it("should handle hover enter events", () => {
			stateMachine.send({ type: "HOVER_ENTER" });
			// Hover effects are handled in animation loop, just verify event is accepted
			expect(stateMachine.getSnapshot().matches("idle")).toBe(true);
		});

		it("should handle hover exit events", () => {
			stateMachine.send({ type: "HOVER_EXIT" });
			expect(stateMachine.getSnapshot().matches("idle")).toBe(true);
		});
	});
});
