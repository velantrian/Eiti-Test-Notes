// @ts-check
const { test, expect } = require('@playwright/test');

test('AI provider selection uses gentle motion and respects reduced-motion preferences', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
  });

  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiSetProvider === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding, .toast').forEach((element) => element.remove()));
  await page.locator('.tab-item[data-view="settings"]').evaluate((element) => element.click());

  await page.locator('#eiti-provider-card-gm').evaluate((element) => element.click());
  const normalMotion = await page.evaluate(() => {
    const icon = document.getElementById('eiti-picon-gm');
    const card = document.getElementById('eiti-provider-card-gm');
    const check = document.getElementById('eiti-pcheck-gm');
    const iconStyle = getComputedStyle(icon);
    const cardStyle = getComputedStyle(card);
    const checkStyle = getComputedStyle(check);
    return {
      provider: localStorage.getItem('eiti_ai_provider'),
      iconClass: icon.className,
      animationName: iconStyle.animationName,
      animationDuration: iconStyle.animationDuration,
      cardTransition: cardStyle.transitionProperty,
      checkText: check.textContent,
      checkTransition: checkStyle.transitionProperty,
    };
  });

  expect(normalMotion.provider).toBe('gemini');
  expect(normalMotion.iconClass).toContain('eiti-provider-select-pop');
  expect(normalMotion.animationName).toBe('eiti-provider-select');
  expect(normalMotion.animationDuration).toBe('0.34s');
  expect(normalMotion.cardTransition).toContain('border-color');
  expect(normalMotion.cardTransition).not.toBe('all');
  expect(normalMotion.checkText).toBe('✅');
  expect(normalMotion.checkTransition).toContain('opacity');
  expect(normalMotion.checkTransition).toContain('transform');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#eiti-provider-card-ds').evaluate((element) => element.click());
  const reducedMotion = await page.evaluate(() => ({
    animationName: getComputedStyle(document.getElementById('eiti-picon-ds')).animationName,
    cardTransitionDuration: getComputedStyle(document.getElementById('eiti-provider-card-ds')).transitionDuration,
    checkTransitionDuration: getComputedStyle(document.getElementById('eiti-pcheck-ds')).transitionDuration,
  }));

  expect(reducedMotion.animationName).toBe('none');
  expect(reducedMotion.cardTransitionDuration).toBe('0s');
  expect(reducedMotion.checkTransitionDuration).toBe('0s');
});
