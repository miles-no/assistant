import { expect, test } from "./fixtures";

test.describe("Dashboard", () => {
	test("should redirect to login when not authenticated", async ({ page }) => {
		await page.goto("/dashboard");

		// Should redirect to login
		await expect(page).toHaveURL("/login");
	});

	test("should display dashboard for authenticated user", async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto("/dashboard");

		await expect(
			authenticatedPage.getByRole("heading", { name: /welcome back, test!/i }),
		).toBeVisible();
		await expect(
			authenticatedPage.getByText(/manage your office bookings/i),
		).toBeVisible();
	});

	test("should display quick action cards", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		// Check for all quick action cards in the main content area
		const main = authenticatedPage.locator("main");
		await expect(
			main.getByRole("heading", { name: "Locations" }),
		).toBeVisible();
		await expect(
			main.getByRole("heading", { name: "My Bookings" }),
		).toBeVisible();
		await expect(main.getByRole("heading", { name: "Settings" })).toBeVisible();

		// Management card should NOT be visible for regular user
		await expect(
			main.getByRole("heading", { name: "Management" }),
		).not.toBeVisible();
	});

	test("should display management card for admin", async ({ adminPage }) => {
		await adminPage.goto("/dashboard");

		// Management card SHOULD be visible for admin
		const main = adminPage.locator("main");
		await expect(
			main.getByRole("heading", { name: "Management" }),
		).toBeVisible();
	});

	test("should display stats cards", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard");

		await expect(
			authenticatedPage.getByText("Upcoming Bookings"),
		).toBeVisible();
		await expect(authenticatedPage.getByText("Total Bookings")).toBeVisible();
		await expect(authenticatedPage.getByText("Favorite Rooms")).toBeVisible();
	});

	test("should navigate to locations from quick action", async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto("/dashboard");

		// Click on Locations in the main content area
		const main = authenticatedPage.locator("main");
		await main.getByRole("heading", { name: "Locations" }).click();
		await expect(authenticatedPage).toHaveURL("/locations");
	});

	test("should navigate to bookings from quick action", async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto("/dashboard");

		// Click on My Bookings in the main content area
		const main = authenticatedPage.locator("main");
		await main.getByRole("heading", { name: "My Bookings" }).click();
		await expect(authenticatedPage).toHaveURL("/bookings");
	});

	test("should display welcome card with CTAs", async ({
		authenticatedPage,
	}) => {
		await authenticatedPage.goto("/dashboard");

		await expect(
			authenticatedPage.getByText(/welcome to miles booking!/i),
		).toBeVisible();
		await expect(
			authenticatedPage.getByRole("button", { name: /explore locations/i }),
		).toBeVisible();
		await expect(
			authenticatedPage.getByRole("button", { name: /view bookings/i }),
		).toBeVisible();
	});
});
