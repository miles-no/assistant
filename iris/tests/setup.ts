// Vitest setup file
import { vi } from "vitest";

// Mock window object for node environment
global.window = global.window || {
	setTimeout: global.setTimeout,
	clearTimeout: global.clearTimeout,
};

// Mock DOM APIs
Object.defineProperty(global.window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock localStorage
global.localStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

// Mock document
global.document = {
	getElementById: vi.fn(),
	createElement: vi.fn(),
	addEventListener: vi.fn(),
};

// Mock console methods to reduce noise in tests
global.console = {
	...console,
	// Uncomment to ignore specific console methods during tests
	// log: vi.fn(),
	// warn: vi.fn(),
	// error: vi.fn(),
};
