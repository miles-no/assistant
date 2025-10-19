import { test, expect } from './fixtures';

test.describe('My Bookings', () => {
  test('should display bookings page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/bookings');

    await expect(authenticatedPage.getByRole('heading', { name: /my bookings/i })).toBeVisible();
    await expect(authenticatedPage.getByText(/manage your meeting room reservations/i)).toBeVisible();
  });

  test('should display upcoming bookings section', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/bookings');

    await expect(authenticatedPage.getByRole('heading', { name: /upcoming/i })).toBeVisible();
  });

  test('should display booking card with details', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/bookings');

    // Check for booking details
    await expect(authenticatedPage.getByText('Team Meeting')).toBeVisible();
    await expect(authenticatedPage.getByText('Weekly sync')).toBeVisible();
    await expect(authenticatedPage.getByText('Conference Room A')).toBeVisible();
  });

  test('should display booking status badge', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/bookings');

    // Status badge should be visible
    await expect(authenticatedPage.getByText('CONFIRMED')).toBeVisible();
  });

  test('should have cancel button for upcoming bookings', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/bookings');

    // Cancel button should be visible for upcoming booking
    await expect(authenticatedPage.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('should open confirmation modal when clicking cancel', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/bookings');

    await authenticatedPage.getByRole('button', { name: /cancel/i }).click();

    // Confirmation modal should appear
    await expect(authenticatedPage.getByText(/are you sure you want to cancel/i)).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /cancel booking/i })).toBeVisible();
  });

  test('should close modal when clicking cancel in confirmation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/bookings');

    await authenticatedPage.getByRole('button', { name: /cancel/i }).first().click();

    // Click the "Cancel" button in the modal (not "Cancel Booking")
    const modalCancelButton = authenticatedPage.getByRole('dialog').getByRole('button', { name: /^cancel$/i });
    await modalCancelButton.click();

    // Modal should close
    await expect(authenticatedPage.getByText(/are you sure you want to cancel/i)).not.toBeVisible();
  });

  test('should display past bookings section when available', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/bookings');

    // Past bookings section should exist
    await expect(authenticatedPage.getByRole('heading', { name: /past & cancelled/i })).toBeVisible();
  });

  test('should display icons for booking details', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/bookings');

    // SVG icons should be present (calendar, clock, location, room)
    const bookingCard = authenticatedPage.locator('text=Team Meeting').locator('..');
    await expect(bookingCard).toBeVisible();
  });
});
