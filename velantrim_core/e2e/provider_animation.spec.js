// @ts-check
const { test, expect } = require('@playwright/test');

const providerMotions = [
  { provider: 'deepseek', suffix: 'ds', effectClass: 'eiti-provider-robot-pop', animationName: 'eiti-provider-robot', duration: '0.46s' },
  { provider: 'gemini', suffix: 'gm', effectClass: 'eiti-provider-lightning-pop', animationName: 'eiti-provider-lightning', duration: '0.56s' },
  { provider: 'openrouter', suffix: 'or', effectClass: 'eiti-provider-route-pop', animationName: 'eiti-provider-route', duration: '0.52s' },
  { provider: 'qwen', suffix: 'qwen', effectClass: 'eiti-provider-orb-pop', animationName: 'eiti-provider-orb', duration: '0.5s' },
];

test('each AI provider symbol has a distinct one-shot motion and respects reduced-motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
  });

  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.eitiSetProvider === 'function');
  await expect(page.locator('#splash')).toBeHidden();
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding, .toast').forEach((element) => element.remove()));
  await page.locator('.tab-item[data-view="settings"]').evaluate((element) => element.click());

  for (const motion of providerMotions) {
    await page.locator(`#eiti-provider-card-${motion.suffix}`).evaluate((element) => element.click());
    const observed = await page.evaluate((suffix) => {
      const icon = document.getElementById(`eiti-picon-${suffix}`);
      const card = document.getElementById(`eiti-provider-card-${suffix}`);
      const check = document.getElementById(`eiti-pcheck-${suffix}`);
      return {
        provider: localStorage.getItem('eiti_ai_provider'),
        iconClass: icon.className,
        animationName: getComputedStyle(icon).animationName,
        animationDuration: getComputedStyle(icon).animationDuration,
        cardTransition: getComputedStyle(card).transitionProperty,
        checkText: check.textContent,
        checkTransition: getComputedStyle(check).transitionProperty,
      };
    }, motion.suffix);

    expect(observed.provider).toBe(motion.provider);
    expect(observed.iconClass).toContain(motion.effectClass);
    expect(observed.animationName).toBe(motion.animationName);
    expect(observed.animationDuration).toBe(motion.duration);
    expect(observed.cardTransition).toContain('border-color');
    expect(observed.cardTransition).not.toBe('all');
    expect(observed.checkText).toBe('✅');
    expect(observed.checkTransition).toContain('opacity');
    expect(observed.checkTransition).toContain('transform');
  }

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
