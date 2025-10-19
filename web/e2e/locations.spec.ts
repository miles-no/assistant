import { test, expect } from './fixtures';

test.describe('Locations', () => {
  test('should display locations page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations');

    await expect(authenticatedPage.getByRole('heading', { name: /office locations/i })).toBeVisible();
    await expect(authenticatedPage.getByText(/browse our \d+ office locations/i)).toBeVisible();
  });

  test('should display location cards with data', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations');

    // Wait for locations to load - scope to main content to avoid sidebar matches
    const main = authenticatedPage.locator('main');
    await expect(main.getByText('Stavanger Office')).toBeVisible();
    await expect(main.getByText('Oslo Office')).toBeVisible();

    // Check location details
    await expect(main.getByText('Tech Street 123')).toBeVisible();
    await expect(main.getByText('Main Avenue 456')).toBeVisible();
  });

  test('should have search functionality', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations');

    await expect(authenticatedPage.getByPlaceholder(/search locations/i)).toBeVisible();
  });

  test('should filter locations by search', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations');

    // Initially both locations visible
    await expect(authenticatedPage.getByText('Stavanger Office')).toBeVisible();
    await expect(authenticatedPage.getByText('Oslo Office')).toBeVisible();

    // Search for Stavanger
    await authenticatedPage.getByPlaceholder(/search locations/i).fill('Stavanger');

    // Only Stavanger should be visible
    await expect(authenticatedPage.getByText('Stavanger Office')).toBeVisible();
    await expect(authenticatedPage.getByText('Oslo Office')).not.toBeVisible();
  });

  test('should have country filter dropdown', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations');

    const countrySelect = authenticatedPage.locator('select');
    await expect(countrySelect).toBeVisible();

    // Should have "All Countries" option
    await expect(countrySelect).toContainText('All Countries');
    await expect(countrySelect).toContainText('Norway');
  });

  test('should display results count', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations');

    await expect(authenticatedPage.getByText(/showing \d+ of \d+ locations/i)).toBeVisible();
  });

  test('should navigate to location details on click', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations');

    // Click on first location card
    await authenticatedPage.getByText('Stavanger Office').click();

    // Should navigate to detail page
    await expect(authenticatedPage).toHaveURL(/\/locations\/1/);
  });

  test('should display empty state when no results', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations');

    // Search for non-existent location
    await authenticatedPage.getByPlaceholder(/search locations/i).fill('NonExistentLocation');

    await expect(authenticatedPage.getByText('No locations found')).toBeVisible();
    await expect(authenticatedPage.getByText(/try adjusting your search/i)).toBeVisible();
  });
});

test.describe('Location Detail', () => {
  test('should display location detail page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations/1');

    await expect(authenticatedPage.getByRole('heading', { name: 'Stavanger Office' })).toBeVisible();
    await expect(authenticatedPage.getByText('Tech Street 123')).toBeVisible();
    await expect(authenticatedPage.getByText(/timezone: europe\/oslo/i)).toBeVisible();
  });

  test('should display location description', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations/1');

    await expect(authenticatedPage.getByText('Modern office in downtown Stavanger')).toBeVisible();
  });

  test('should display meeting rooms section', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations/1');

    await expect(authenticatedPage.getByRole('heading', { name: /meeting rooms/i })).toBeVisible();
    await expect(authenticatedPage.getByText('Conference Room A')).toBeVisible();
    await expect(authenticatedPage.getByText(/capacity: 10 people/i)).toBeVisible();
  });

  test('should display room amenities', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations/1');

    await expect(authenticatedPage.getByText('Projector')).toBeVisible();
    await expect(authenticatedPage.getByText('Whiteboard')).toBeVisible();
  });

  test('should have back button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations/1');

    const backButton = authenticatedPage.getByRole('button', { name: /back/i });
    await expect(backButton).toBeVisible();

    await backButton.click();
    await expect(authenticatedPage).toHaveURL('/locations');
  });

  test('should handle non-existent location gracefully', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/locations/999');

    await expect(authenticatedPage.getByText(/failed to load location details/i)).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /back to locations/i })).toBeVisible();
  });
});
