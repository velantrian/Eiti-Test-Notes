// @ts-check
const { test, expect } = require('@playwright/test');

test('bottom app navigation and Notes view stay inside the app shell on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
  });

  await page.goto('/index.html');
  await page.waitForFunction(() => {
    const app = document.getElementById('app');
    return app && getComputedStyle(app).display === 'flex';
  }, null, { timeout: 20_000 });
  await expect(page.locator('#splash')).toBeHidden();

  const nav = page.locator('.tab-bar');
  await expect(nav).toBeVisible();

  const assertLayout = async () => {
    const geometry = await page.evaluate(() => {
      const app = document.getElementById('app');
      const notes = document.getElementById('view-notes');
      const tabBar = document.querySelector('.tab-bar');
      const composer = document.querySelector('.chat-input-panel');
      const appRect = app.getBoundingClientRect();
      const navRect = tabBar.getBoundingClientRect();
      const composerRect = composer.getBoundingClientRect();
      return {
        appBottom: appRect.bottom,
        navBottom: navRect.bottom,
        navTop: navRect.top,
        navHeight: navRect.height,
        navParentId: tabBar.parentElement.id,
        notesParentId: notes.parentElement.id,
        composerBottom: composerRect.bottom,
        viewportHeight: window.innerHeight,
      };
    });

    expect(geometry.navParentId).toBe('app');
    expect(geometry.notesParentId).toBe('app');
    expect(geometry.navHeight).toBeGreaterThan(0);
    expect(geometry.navTop).toBeGreaterThanOrEqual(-1);
    expect(geometry.navBottom).toBeLessThanOrEqual(geometry.appBottom + 1);
    expect(geometry.appBottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
    expect(geometry.composerBottom).toBeLessThanOrEqual(geometry.navTop + 1);
  };

  await assertLayout();

  // A smaller visual layout approximates the available screen above a mobile keyboard.
  await page.locator('#input').focus();
  await page.setViewportSize({ width: 360, height: 420 });
  await page.waitForFunction(() => window.innerHeight === 420);
  await assertLayout();
});
