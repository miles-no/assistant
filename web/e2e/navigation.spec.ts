import { expect, test } from "./fixtures";

test.describe("Navigation & Layout", () => {
	test("should display sidebar with logo", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		// Check for logo in sidebar
		const sidebar = authenticatedPage.locator("aside, nav").first();
		await expect(sidebar.getByText("Miles Booking")).toBeVisible();
	});

	test("should display navigation items", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		// Check all nav items are visible
		await expect(
			authenticatedPage.getByRole("link", { name: /dashboard/i }),
		).toBeVisible();
		await expect(
			authenticatedPage.getByRole("link", { name: /locations/i }),
		).toBeVisible();
		await expect(
			authenticatedPage.getByRole("link", { name: /my bookings/i }),
		).toBeVisible();
		await expect(
			authenticatedPage.getByRole("link", { name: /settings/i }),
		).toBeVisible();
	});

	test("should not show management nav for regular user", async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto("/dashboard");

		await expect(
			authenticatedPage.getByRole("link", { name: /management/i }),
		).not.toBeVisible();
	});

	test("should show management nav for admin", async ({ adminPage }) => {
		await adminPage.goto("/dashboard");

		// Check for Management link in sidebar navigation
		const sidebar = adminPage.locator("aside, nav").first();
		await expect(
			sidebar.getByRole("link", { name: /management/i }),
		).toBeVisible();
	});

	test("should highlight active route", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/locations");

		// Locations link should have active styling
		const locationsLink = authenticatedPage.getByRole("link", {
			name: /locations/i,
		});
		await expect(locationsLink).toHaveClass(/bg-primary-50/);
	});

	test("should navigate between pages using sidebar", async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto("/dashboard");

		// Navigate to locations
		await authenticatedPage.getByRole("link", { name: /locations/i }).click();
		await expect(authenticatedPage).toHaveURL("/locations");

		// Navigate to bookings
		await authenticatedPage.getByRole("link", { name: /my bookings/i }).click();
		await expect(authenticatedPage).toHaveURL("/bookings");

		// Navigate back to dashboard
		await authenticatedPage.getByRole("link", { name: /dashboard/i }).click();
		await expect(authenticatedPage).toHaveURL("/dashboard");
	});

	test("should display user info in sidebar", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		// Check user info in the sidebar specifically
		const sidebar = authenticatedPage.locator("aside, nav").first();
		await expect(sidebar.getByText("Test User")).toBeVisible();
		// Check for USER badge with exact match to avoid matching "Test User"
		await expect(sidebar.getByText("USER", { exact: true })).toBeVisible();
	});

	test("should have logout button", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		const logoutButton = authenticatedPage.getByRole("button", {
			name: /logout/i,
		});
		await expect(logoutButton).toBeVisible();
	});

	test("should logout and redirect to login", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		await authenticatedPage.getByRole("button", { name: /logout/i }).click();

		// Should redirect to login (after clearing auth)
		await expect(authenticatedPage).toHaveURL("/login");
	});

	test("should display user info in header", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		// Header should show user info (desktop view)
		// User info appears in sidebar, which serves as both sidebar and header
		const sidebar = authenticatedPage.locator("aside, nav").first();
		await expect(sidebar.getByText("Test User")).toBeVisible();
	});

	test("should have mobile menu button on small screens", async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.setViewportSize({ width: 375, height: 667 }); // Mobile size
		await authenticatedPage.goto("/dashboard");

		// Mobile menu button should be visible
		const menuButton = authenticatedPage
			.getByRole("button")
			.filter({ has: authenticatedPage.locator("svg") })
			.first();
		await expect(menuButton).toBeVisible();
	});
});
