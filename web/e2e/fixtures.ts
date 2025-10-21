import type { Page } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

// Mock API data
export const mockUser = {
	id: "1",
	email: "test@miles.com",
	firstName: "Test",
	lastName: "User",
	role: "USER" as const,
	createdAt: new Date().toISOString(),
};

export const mockAdminUser = {
	id: "2",
	email: "admin@miles.com",
	firstName: "Admin",
	lastName: "User",
	role: "ADMIN" as const,
	createdAt: new Date().toISOString(),
};

export const mockLocations = [
	{
		id: "1",
		name: "Stavanger Office",
		address: "Tech Street 123",
		city: "Stavanger",
		country: "Norway",
		timezone: "Europe/Oslo",
		description: "Modern office in downtown Stavanger",
		createdAt: new Date().toISOString(),
		rooms: [
			{
				id: "1",
				name: "Conference Room A",
				locationId: "1",
				capacity: 10,
				description: "Large meeting room",
				amenities: ["Projector", "Whiteboard", "Video Conference"],
				isActive: true,
				createdAt: new Date().toISOString(),
			},
		],
		managers: [],
	},
	{
		id: "2",
		name: "Oslo Office",
		address: "Main Avenue 456",
		city: "Oslo",
		country: "Norway",
		timezone: "Europe/Oslo",
		description: "Headquarters in Oslo",
		createdAt: new Date().toISOString(),
		rooms: [],
		managers: [],
	},
];

export const mockBookings = [
	{
		id: "1",
		roomId: "1",
		userId: "1",
		startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
		endTime: new Date(Date.now() + 90000000).toISOString(),
		title: "Team Meeting",
		description: "Weekly sync",
		status: "CONFIRMED" as const,
		createdAt: new Date().toISOString(),
		room: mockLocations[0].rooms[0],
	},
];

// Helper to login and set auth state
export async function loginAsUser(page: Page, user = mockUser) {
	// Set auth token and user in localStorage
	await page.addInitScript((userData) => {
		localStorage.setItem("token", "mock-jwt-token");
		localStorage.setItem("user", JSON.stringify(userData));
	}, user);
}

// Helper to mock API endpoints
export async function mockApiEndpoints(page: Page, user = mockUser) {
	// Mock auth endpoints
	await page.route("**/api/auth/login", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				token: "mock-jwt-token",
				user: user,
			}),
		});
	});

	await page.route("**/api/auth/register", async (route) => {
		await route.fulfill({
			status: 201,
			contentType: "application/json",
			body: JSON.stringify({
				token: "mock-jwt-token",
				user: user,
			}),
		});
	});

	await page.route("**/api/auth/me", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(user),
		});
	});

	// Mock locations endpoints
	await page.route("**/api/locations", async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockLocations),
			});
		}
	});

	await page.route("**/api/locations/*", async (route) => {
		const locationId = route.request().url().split("/").pop();
		const location = mockLocations.find((l) => l.id === locationId);
		if (location) {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(location),
			});
		} else {
			await route.fulfill({ status: 404 });
		}
	});

	// Mock bookings endpoints
	await page.route("**/api/bookings**", async (route) => {
		if (route.request().method() === "GET") {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockBookings),
			});
		} else if (route.request().method() === "DELETE") {
			await route.fulfill({ status: 204 });
		}
	});
}

// Extended test with fixtures
export const test = base.extend<{
	authenticatedPage: Page;
	adminPage: Page;
}>({
	authenticatedPage: async ({ page }, use) => {
		await mockApiEndpoints(page, mockUser);
		await loginAsUser(page, mockUser);
		await use(page);
	},
	adminPage: async ({ page }, use) => {
		await mockApiEndpoints(page, mockAdminUser);
		await loginAsUser(page, mockAdminUser);
		await use(page);
	},
});

export { expect };
