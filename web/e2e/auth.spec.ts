import { expect, mockApiEndpoints, mockUser, test } from "./fixtures";

test.describe("Authentication", () => {
	test.beforeEach(async ({ page }) => {
		await mockApiEndpoints(page);
	});

	test("should display login page", async ({ page }) => {
		await page.goto("/login");

		await expect(page.locator("h1")).toContainText("Miles Booking");
		await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
		await expect(page.getByPlaceholder(/email/i)).toBeVisible();
		await expect(page.getByPlaceholder(/password/i)).toBeVisible();
	});

	test("should show test credentials on login page", async ({ page }) => {
		await page.goto("/login");

		await expect(page.getByText("Test Credentials:")).toBeVisible();
		await expect(page.getByText("admin@miles.com")).toBeVisible();
	});

	test("should validate empty form submission", async ({ page }) => {
		await page.goto("/login");

		await page.getByRole("button", { name: /sign in/i }).click();

		// Should show validation errors
		await expect(page.getByText("Email is required")).toBeVisible();
		await expect(page.getByText("Password is required")).toBeVisible();
	});

	test("should successfully login and redirect to dashboard", async ({
		page,
	}) => {
		await page.goto("/login");

		await page.getByPlaceholder(/email/i).fill("test@miles.com");
		await page.getByPlaceholder(/password/i).fill("password123");
		await page.getByRole("button", { name: /sign in/i }).click();

		// Should redirect to dashboard
		await expect(page).toHaveURL("/dashboard");
		await expect(
			page.getByText(`Welcome back, ${mockUser.firstName}!`),
		).toBeVisible();
	});

	test("should display register page", async ({ page }) => {
		await page.goto("/register");

		await expect(page.locator("h1")).toContainText("Miles Booking");
		await expect(
			page.getByRole("button", { name: /create account/i }),
		).toBeVisible();
		await expect(page.getByPlaceholder(/first name/i)).toBeVisible();
		await expect(page.getByPlaceholder(/last name/i)).toBeVisible();
		await expect(page.getByPlaceholder(/email/i)).toBeVisible();
		await expect(page.getByPlaceholder(/password/i)).toBeVisible();
	});

	test("should successfully register and redirect to dashboard", async ({
		page,
	}) => {
		await page.goto("/register");

		await page.getByPlaceholder(/first name/i).fill("John");
		await page.getByPlaceholder(/last name/i).fill("Doe");
		await page.getByPlaceholder(/email/i).fill("john@example.com");
		await page.getByPlaceholder(/password/i).fill("password123");
		await page.getByRole("button", { name: /create account/i }).click();

		// Should redirect to dashboard
		await expect(page).toHaveURL("/dashboard");
	});

	test("should redirect to dashboard if already logged in", async ({
		page,
	}) => {
		// Set auth state
		await page.addInitScript((userData) => {
			localStorage.setItem("token", "mock-jwt-token");
			localStorage.setItem("user", JSON.stringify(userData));
		}, mockUser);

		await page.goto("/login");

		// Should auto-redirect to dashboard
		await expect(page).toHaveURL("/dashboard");
	});

	test("should have link to switch between login and register", async ({
		page,
	}) => {
		await page.goto("/login");

		await page.getByRole("link", { name: /sign up/i }).click();
		await expect(page).toHaveURL("/register");

		await page.getByRole("link", { name: /sign in/i }).click();
		await expect(page).toHaveURL("/login");
	});
});
