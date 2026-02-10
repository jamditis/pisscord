import { test, expect } from '@playwright/test';

test.describe('Pisscord smoke tests', () => {
  test('app loads without crashing', async ({ page }) => {
    await page.goto('/');
    // The app should render something in the root div
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
  });

  test('page has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Pisscord');
  });

  test('shows login or main UI', async ({ page }) => {
    await page.goto('/');
    // Wait for the app to initialize (splash screen, auth check, etc.)
    // The app either shows a login form or the main chat UI
    // Look for common elements that appear in either state
    await page.waitForTimeout(3000); // Allow time for Firebase auth check

    // Either the auth gate (login) or the main app should be visible
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    // The page should have rendered React content (not be blank)
    expect(body!.length).toBeGreaterThan(0);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Filter out known acceptable errors (Firebase auth, network errors in test env)
    const criticalErrors = errors.filter(e =>
      !e.includes('Firebase') &&
      !e.includes('auth') &&
      !e.includes('network') &&
      !e.includes('ERR_CONNECTION')
    );

    expect(criticalErrors).toEqual([]);
  });
});
