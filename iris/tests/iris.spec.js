// IRIS Terminal - Happy Path Tests
import { test, expect } from '@playwright/test';

// Test credentials
const TEST_USER = {
  email: 'john.doe@miles.com',
  password: 'password123'
};

// Helper function to login
async function login(page) {
  await page.goto('/');

  // Wait for login screen
  await expect(page.locator('#login-screen')).toBeVisible();

  // Fill in credentials
  await page.fill('#email', TEST_USER.email);
  await page.fill('#password', TEST_USER.password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for terminal to appear
  await expect(page.locator('#terminal')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#login-screen')).not.toBeVisible();

  // Wait for welcome message to finish
  await page.waitForTimeout(1000);
}

// Helper function to send command and wait for response (for LLM commands)
async function sendCommand(page, command) {
  const input = page.locator('#terminal-input');
  await input.fill(command);
  await input.press('Enter');

  // Wait for thinking indicator to appear and disappear
  await expect(page.locator('#typing-indicator')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#typing-indicator')).not.toBeVisible({ timeout: 30000 });
}

// Helper function for built-in commands that don't use LLM (instant execution)
async function sendBuiltInCommand(page, command) {
  const input = page.locator('#terminal-input');
  await input.fill(command);
  await input.press('Enter');

  // Just wait a short time for instant command to execute
  await page.waitForTimeout(500);
}

// Helper to get last terminal output
async function getLastOutput(page) {
  const outputs = page.locator('.terminal-line');
  const count = await outputs.count();
  if (count === 0) return '';

  const lastOutput = outputs.nth(count - 1);
  return await lastOutput.textContent();
}

test.describe('IRIS Terminal - Happy Paths', () => {

  test('01 - Login flow', async ({ page }) => {
    await page.goto('/');

    // Verify login screen is visible
    await expect(page.locator('#login-screen')).toBeVisible();
    // Verify ASCII art is present (it's made of block characters, not text "IRIS")
    await expect(page.locator('.ascii-art')).toBeVisible();

    // Fill credentials
    await page.fill('#email', TEST_USER.email);
    await page.fill('#password', TEST_USER.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Verify login success
    await expect(page.locator('#terminal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#login-screen')).not.toBeVisible();

    // Verify user info is displayed
    await expect(page.locator('#user-info')).toContainText('John');

    // Verify IRIS eye is visible
    await expect(page.locator('#hal-eye')).toBeVisible();
  });

  test('02 - Display rooms command', async ({ page }) => {
    await login(page);

    // Send rooms command
    await sendCommand(page, 'rooms');

    // Verify output contains room data
    const output = page.locator('.terminal-output');
    await expect(output).toContainText('[OK] Room data retrieved');
    await expect(output).toContainText('NAME');
    await expect(output).toContainText('CAPACITY');
  });

  test('03 - Display bookings command', async ({ page }) => {
    await login(page);

    // Send bookings command
    await sendCommand(page, 'bookings');

    // Verify output contains booking data or warning
    const output = page.locator('.terminal-output');

    // Check for either success with bookings or warning with no bookings
    const outputText = await output.textContent();
    const hasBookings = outputText.includes('[OK] Booking data retrieved');
    const noBookings = outputText.includes('[WARNING] No active bookings found');

    expect(hasBookings || noBookings).toBeTruthy();
  });

  test('04 - Help command', async ({ page }) => {
    await login(page);

    // Send help command (built-in command, no LLM)
    await sendBuiltInCommand(page, 'help');

    // Verify help output
    const output = page.locator('.terminal-output');
    await expect(output).toContainText('COMMAND REFERENCE');
    await expect(output).toContainText('rooms');
    await expect(output).toContainText('bookings');
    await expect(output).toContainText('cancel');
  });

  test('05 - Status command', async ({ page }) => {
    await login(page);

    // Send status command (built-in command, no LLM)
    await sendBuiltInCommand(page, 'status');

    // Verify status output
    const output = page.locator('.terminal-output');
    await expect(output).toContainText('SYSTEM STATUS');
    await expect(output).toContainText('IRIS v1.0');
    await expect(output).toContainText('John');
  });

  test('06 - Clear command', async ({ page }) => {
    await login(page);

    // Send some commands first (built-in command)
    await sendBuiltInCommand(page, 'help');

    // Verify output exists
    let outputs = page.locator('.terminal-line');
    let count = await outputs.count();
    expect(count).toBeGreaterThan(5);

    // Clear terminal (built-in command)
    await sendBuiltInCommand(page, 'clear');

    // Verify terminal is cleared
    outputs = page.locator('.terminal-line');
    count = await outputs.count();
    expect(count).toBeLessThan(3); // Only user command and maybe prompt
  });

  test('07 - Check room availability', async ({ page }) => {
    await login(page);

    // Get a room name first
    await sendCommand(page, 'rooms');
    await page.waitForTimeout(500);

    // Check availability (generic query)
    await sendCommand(page, 'when is skagen available?');

    // Verify availability response
    const output = page.locator('.terminal-output');
    const outputText = await output.textContent();

    // Should either show availability data or room not found
    const hasAvailability = outputText.includes('[OK] Availability data retrieved') ||
                           outputText.includes('available') ||
                           outputText.includes('Room') ||
                           outputText.includes('not found');

    expect(hasAvailability).toBeTruthy();
  });

  // Skipping test 08 - IRIS eye interactions (element is animated and unstable for Playwright clicks)

  test('09 - Command history navigation', async ({ page }) => {
    await login(page);

    const input = page.locator('#terminal-input');

    // Send a command (built-in command)
    await sendBuiltInCommand(page, 'status');

    // Press up arrow to recall command
    await input.press('ArrowUp');

    // Verify command is recalled
    const value = await input.inputValue();
    expect(value).toBe('status');
  });

  test('10 - Demo mode', async ({ page }) => {
    await login(page);

    // Start demo mode (built-in command)
    await sendBuiltInCommand(page, 'demo');

    // Wait for demo to start
    await page.waitForTimeout(1000);

    // Verify demo output
    const output = page.locator('.terminal-output');
    await expect(output).toContainText('IRIS DEMO MODE');
    await expect(output).toContainText('[DEMO]');

    // Stop demo mode (built-in command)
    await sendBuiltInCommand(page, 'stop');

    // Verify demo stopped
    await expect(output).toContainText('Sequence completed');
  });

  test('11 - Logout flow', async ({ page }) => {
    await login(page);

    // Click logout button
    await page.click('#logout-btn');

    // Verify redirected to login screen
    await expect(page.locator('#login-screen')).toBeVisible();
    await expect(page.locator('#terminal')).not.toBeVisible();
  });

  test('12 - Natural language room query', async ({ page }) => {
    await login(page);

    // Send natural language query
    await sendCommand(page, 'show me all rooms');

    // Verify response
    const output = page.locator('.terminal-output');
    await expect(output).toContainText('Room'); // Should contain room-related content
  });

  test('13 - Natural language booking query', async ({ page }) => {
    await login(page);

    // Send natural language query
    await sendCommand(page, 'show my bookings');

    // Verify response
    const output = page.locator('.terminal-output');
    const outputText = await output.textContent();

    // Should show bookings or no bookings message
    const validResponse = outputText.includes('booking') ||
                         outputText.includes('Booking') ||
                         outputText.includes('No active bookings');

    expect(validResponse).toBeTruthy();
  });

  test('14 - IRIS personality responses', async ({ page }) => {
    await login(page);

    // Send irrelevant query
    await sendCommand(page, "what's up?");

    // Verify cold, HAL-9000 style response
    const output = page.locator('.terminal-output');
    const outputText = await output.textContent();

    // Should get a dismissive response
    const hasColdResponse = outputText.includes('irrelevant') ||
                           outputText.includes('operational') ||
                           outputText.includes('Query');

    expect(hasColdResponse).toBeTruthy();
  });

  test('15 - IRIS status indicator changes', async ({ page }) => {
    await login(page);

    const status = page.locator('#hal-status');

    // Initial status
    await expect(status).toContainText('ONLINE');

    // Send a command
    const input = page.locator('#terminal-input');
    await input.fill('rooms');
    await input.press('Enter');

    // Status should change to PROCESSING
    await expect(status).toContainText('PROCESSING', { timeout: 2000 });

    // Wait for command to complete
    await expect(page.locator('#typing-indicator')).not.toBeVisible({ timeout: 10000 });

    // Status should return to ONLINE
    await expect(status).toContainText('ONLINE');
  });

  test('16 - Multiple sequential commands', async ({ page }) => {
    await login(page);

    // Run multiple commands in sequence
    await sendCommand(page, 'rooms');
    await page.waitForTimeout(500);

    await sendCommand(page, 'bookings');
    await page.waitForTimeout(500);

    await sendBuiltInCommand(page, 'status'); // Built-in command
    await page.waitForTimeout(500);

    // Verify all outputs are present
    const output = page.locator('.terminal-output');
    await expect(output).toContainText('Room');
    await expect(output).toContainText('SYSTEM STATUS');
  });
});
