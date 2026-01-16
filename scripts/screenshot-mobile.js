const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

async function takeScreenshots() {
  const browser = await chromium.launch();

  // Define mobile viewports to test
  const viewports = [
    { name: 'iPhone-SE', width: 375, height: 667, deviceScaleFactor: 2 },
    { name: 'iPhone-16-Pro-Max', width: 430, height: 932, deviceScaleFactor: 3 },
    { name: 'Samsung-S24-Ultra', width: 412, height: 915, deviceScaleFactor: 3.75 },
  ];

  const screenshotDir = path.join(__dirname, '..', 'screenshots');

  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  for (const viewport of viewports) {
    console.log(`Taking screenshot for ${viewport.name}...`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
    });

    const page = await context.newPage();

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('PeerJS') && !msg.text().includes('SOUND') && !msg.text().includes('WebSocket')) {
        console.log(`  [CONSOLE ERROR] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.log(`  [PAGE ERROR] ${error.message}`);
    });

    try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for splash screen to finish (3 seconds + buffer)
      await page.waitForTimeout(4000);

      // Try to dismiss any modal (release notes "Maybe later")
      try {
        const maybeLater = page.locator('text=Maybe later');
        if (await maybeLater.isVisible({ timeout: 2000 })) {
          await maybeLater.click();
          console.log(`  - Dismissed release notes modal`);
          await page.waitForTimeout(500);
        }
      } catch (e) {
        // No modal to dismiss
      }

      // Take screenshot of main view (chat)
      await page.screenshot({
        path: path.join(screenshotDir, `${viewport.name}-chat.png`),
        fullPage: false
      });
      console.log(`  - Captured chat view`);

      // Click on Channels tab
      try {
        const channelsTab = page.locator('button').filter({ hasText: 'Channels' }).first();
        if (await channelsTab.isVisible({ timeout: 1000 })) {
          await channelsTab.click();
          await page.waitForTimeout(500);
          await page.screenshot({
            path: path.join(screenshotDir, `${viewport.name}-channels.png`),
            fullPage: false
          });
          console.log(`  - Captured channels view`);
        }
      } catch (e) {
        console.log(`  - Could not capture channels view: ${e.message}`);
      }

      // Click on Voice tab
      try {
        const voiceTab = page.locator('button').filter({ hasText: 'Voice' }).first();
        if (await voiceTab.isVisible({ timeout: 1000 })) {
          await voiceTab.click();
          await page.waitForTimeout(500);
          await page.screenshot({
            path: path.join(screenshotDir, `${viewport.name}-voice.png`),
            fullPage: false
          });
          console.log(`  - Captured voice view`);
        }
      } catch (e) {
        console.log(`  - Could not capture voice view: ${e.message}`);
      }

      // Click on Online/Users tab
      try {
        const usersTab = page.locator('button').filter({ hasText: 'Online' }).first();
        if (await usersTab.isVisible({ timeout: 1000 })) {
          await usersTab.click();
          await page.waitForTimeout(500);
          await page.screenshot({
            path: path.join(screenshotDir, `${viewport.name}-users.png`),
            fullPage: false
          });
          console.log(`  - Captured users view`);
        }
      } catch (e) {
        console.log(`  - Could not capture users view: ${e.message}`);
      }

    } catch (e) {
      console.error(`Error for ${viewport.name}:`, e.message);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nScreenshots saved to:', screenshotDir);
}

takeScreenshots().catch(console.error);
