// @ts-check
// v14.15.2: «📱 Экран телефона» — пресеты выреза. Базой остаётся env(safe-area-inset-*), пресет задаёт минимум:
// --eiti-*-inset = max(env, пресет). «Авто» по умолчанию = как раньше (шапка 88, таб-бар 110).
// env() в Chromium не эмулируется → тесты подменяют --eiti-env-* на <html> (точка подмены, предусмотренная в CSS).
const { test, expect, devices } = require('@playwright/test');
const path = require('path');

const SHOTS = process.env.EITI_SHOTS_DIR || '';
const CYR = /[а-яё]/i;
const VIEW = { width: 412, height: 915 };
const PRESETS = {
  'iphone-notch': [47, 34, 47, 21], 'iphone-island': [59, 34, 59, 21], 'iphone-se': [20, 0, 0, 0],
  'galaxy-s': [32, 16, 32, 16], 'galaxy-fold': [28, 16, 28, 16], xiaomi: [34, 16, 34, 16], pixel: [36, 20, 36, 20], none: [0, 0, 0, 0],
};

async function boot(page, { preset = null, storage = {}, view = VIEW } = {}) {
  if (view) await page.setViewportSize(view);
  await page.addInitScript(([p, values]) => {
    if (sessionStorage.getItem('__eiti_ps_booted')) return;
    sessionStorage.setItem('__eiti_ps_booted', '1');
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    if (p) localStorage.setItem('eiti_phone_screen', p);
    for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  }, [preset, storage]);
  await page.goto('/index.html');
  await page.waitForFunction(() => window.eitiChatReady === true, null, { timeout: 30000 });
  await clean(page);
}
async function clean(page) {
  await page.addStyleTag({ content: '#eiti-pin-modal,#pwa-install-banner{display:none!important}' });
  await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()));
}
const geo = (page, sel) => page.locator(sel).first().evaluate((el) => {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  return { top: r.top, bottom: r.bottom, h: r.height, pt: parseFloat(cs.paddingTop), pb: parseFloat(cs.paddingBottom), pl: parseFloat(cs.paddingLeft), pr: parseFloat(cs.paddingRight) };
});
const setEnv = (page, env) => page.evaluate((e) => { for (const [k, v] of Object.entries(e)) document.documentElement.style.setProperty('--eiti-env-' + k, v + 'px'); }, env);
async function shot(page, name) {
  if (!SHOTS) return;
  await clean(page);
  await page.screenshot({ path: path.join(SHOTS, 'phone-screen-' + name + '.png') });
}
async function layout(page) {
  return { header: await geo(page, '.app-header'), tab: await geo(page, '.tab-bar'), input: await geo(page, '.chat-input-panel'), msgs: await geo(page, '#messages') };
}
function expectFlush(m, vh) {
  expect(Math.abs(m.msgs.top - m.header.bottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.input.top - m.msgs.bottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.input.bottom - m.tab.top)).toBeLessThanOrEqual(1);
  expect(Math.round(m.tab.bottom)).toBe(vh);
}

test('по умолчанию «Авто»: как в main (88 / 110, без отступов), даже если env отдаёт вырез', async ({ page }) => {
  await boot(page);
  expect(await page.evaluate(() => [document.documentElement.classList.contains('eiti-phone'), window.eitiPhoneScreenGet()])).toEqual([false, 'auto']);
  let m = await layout(page);
  expect(Math.round(m.header.h)).toBe(88); expect(m.header.pt).toBe(0);
  expect(Math.round(m.tab.h)).toBe(110);
  expectFlush(m, VIEW.height);
  await shot(page, 'default-412');
  await setEnv(page, { top: 47, bottom: 34 }); // не-iOS + Авто: пресетных правил нет → без изменений
  m = await layout(page);
  expect(Math.round(m.header.h)).toBe(88); expect(Math.round(m.tab.h)).toBe(110);
});

for (const [id, [t, b]] of Object.entries(PRESETS)) {
  test(`пресет ${id}: шапка 88+${t}, таб-бар 110+${b}, контент встык`, async ({ page }) => {
    await boot(page, { preset: id });
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-eiti-phone'))).toBe(id);
    const m = await layout(page);
    expect(Math.round(m.header.h)).toBe(88 + t); expect(m.header.pt).toBe(t);
    expect(Math.round(m.tab.h)).toBe(110 + b); expect(m.tab.pb).toBe(4 + b);
    expect(m.header.pl).toBe(0); // портрет: боковых отступов нет
    const act = await geo(page, '.app-header .header-actions'); // кнопки шапки не залезают в зону выреза
    expect(act.top).toBeGreaterThanOrEqual(t - 0.5); expect(act.bottom).toBeLessThanOrEqual(m.header.bottom + 0.5);
    expectFlush(m, VIEW.height);
    if (['iphone-notch', 'iphone-island', 'galaxy-s'].includes(id)) await shot(page, id + '-412');
  });
}

test('max(env, пресет): система даёт больше — берём систему; меньше — пресет', async ({ page }) => {
  await boot(page, { preset: 'galaxy-s' });
  await setEnv(page, { top: 50, bottom: 8 });
  let m = await layout(page);
  expect(m.header.pt).toBe(50); expect(m.tab.pb).toBe(4 + 16);
  await setEnv(page, { top: 10, bottom: 30 });
  m = await layout(page);
  expect(m.header.pt).toBe(32); expect(m.tab.pb).toBe(4 + 30);
});

test('вместе с «Меньше иконки»: отступы прибавляются к компактным 44 / 50', async ({ page }) => {
  await boot(page, { preset: 'iphone-island', storage: { eiti_small_icons: '1' } });
  const m = await layout(page);
  expect(Math.round(m.header.h)).toBe(44 + 59); expect(m.header.pt).toBe(59);
  expect(Math.round(m.tab.h)).toBe(50 + 34);
  const item = await geo(page, '.tab-item[data-view="chat"]');
  expect(item.h).toBeGreaterThanOrEqual(36); expect(item.bottom).toBeLessThanOrEqual(m.tab.bottom - 34 + 0.5);
  expectFlush(m, VIEW.height);
  await shot(page, 'small-icons-island-412');
});

test('альбомная: сверху только системный отступ, вырез уходит вбок (боковые отступы)', async ({ page }) => {
  await boot(page, { preset: 'iphone-island', view: { width: 915, height: 412 } });
  const m = await layout(page);
  expect(m.header.pt).toBe(0); expect(Math.round(m.header.h)).toBe(88);
  expect(m.header.pl).toBe(59); expect(m.header.pr).toBe(59);
  expect(m.tab.pl).toBe(59); expect(m.tab.pb).toBe(4 + 21);
});

test('раздел настроек: выбор применяется сразу, сохраняется, «Авто» возвращает как было; класс до первой отрисовки', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => openPhoneScreenMode());
  await expect(page.locator('#view-phone-screen')).toBeVisible();
  await expect(page.locator('#eiti-ps-list input[type=radio]')).toHaveCount(9);
  await expect(page.locator('#eiti-ps-list input[value=auto]')).toBeChecked();
  await shot(page, 'settings-default-412');
  await page.locator('#eiti-ps-list input[value=iphone-island]').check();
  await expect.poll(() => geo(page, '.app-header').then((g) => g.pt)).toBe(59);
  expect(await page.evaluate(() => localStorage.getItem('eiti_phone_screen'))).toBe('iphone-island');
  await expect(page.locator('#eiti-ps-phone')).toHaveAttribute('data-cut', 'island');
  await expect(page.locator('#eiti-ps-cap')).toContainText('59');
  await shot(page, 'settings-island-412');

  await page.reload();
  await page.waitForFunction(() => window.eitiChatReady === true, null, { timeout: 30000 });
  expect((await geo(page, '.app-header')).pt).toBe(59);
  await clean(page);
  await page.evaluate(() => openPhoneScreenMode());
  await page.locator('#eiti-ps-list input[value=auto]').check();
  await page.evaluate(() => openView('chat'));
  await expect.poll(() => geo(page, '.app-header').then((g) => Math.round(g.h))).toBe(88);
  expect(await page.evaluate(() => [localStorage.getItem('eiti_phone_screen'), document.documentElement.style.getPropertyValue('--eiti-pt'), document.documentElement.classList.contains('eiti-phone')])).toEqual([null, '', false]);
});

test('ранний скрипт: класс и переменные стоят к DOMContentLoaded-интерактиву', async ({ page }) => {
  await page.setViewportSize(VIEW);
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_phone_screen', 'pixel');
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'interactive') window.__psAt = [document.documentElement.classList.contains('eiti-phone'), document.documentElement.style.getPropertyValue('--eiti-pt')];
    });
  });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__psAt !== undefined);
  expect(await page.evaluate(() => window.__psAt)).toEqual([true, '36px']);
});

// Эмулированные устройства: подсказка «Похоже, у вас …» только предлагает, сама ничего не меняет.
const DEVICES = [['iPhone 13', 'iphone-notch', 47], ['iPhone 15 Pro', 'iphone-island', 59], ['Pixel 7', 'pixel', 36], ['Galaxy S24', 'galaxy-s', 32]];
for (const [dev, guess, top] of DEVICES) {
  test.describe(dev, () => {
    const { defaultBrowserType, ...d } = devices[dev]; // eslint-disable-line no-unused-vars
    test.use(d);
    test(`${dev}: подсказка → ${guess}, применяется только по кнопке; отступ ${top}px`, async ({ page }) => {
      // Chromium-эмуляция отдаёт screen = viewport; настоящий Safari отдаёт размер экрана устройства — подставляем его.
      const scr = d.screen || d.viewport;
      await page.addInitScript(([w, h]) => {
        Object.defineProperty(screen, 'width', { get: () => w }); Object.defineProperty(screen, 'height', { get: () => h });
      }, [scr.width, scr.height]);
      await boot(page, { view: null });
      const vh = page.viewportSize().height;
      let m = await layout(page);
      expect(Math.round(m.header.h)).toBe(88); // Авто: env() в эмуляции = 0 → как в main
      await shot(page, dev.replace(/\s+/g, '-').toLowerCase() + '-default');
      await page.evaluate(() => openPhoneScreenMode());
      await expect(page.locator('#eiti-ps-hint')).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('eiti_phone_screen'))).toBe(null);
      await page.locator('#eiti-ps-hint-btn').click();
      await expect(page.locator('#eiti-ps-hint')).toBeHidden();
      await expect(page.locator(`#eiti-ps-list input[value=${guess}]`)).toBeChecked();
      await page.evaluate(() => openView('chat'));
      m = await layout(page);
      expect(m.header.pt).toBe(top);
      expectFlush(m, vh);
      await shot(page, dev.replace(/\s+/g, '-').toLowerCase() + '-' + guess);
    });
  });
}

for (const [loc, title] of [['en', '📱 Phone screen'], ['de', '📱 Handy-Bildschirm']]) {
  test(`светлая тема + ${loc.toUpperCase()}: раздел без кириллицы`, async ({ page }) => {
    await boot(page, { preset: 'galaxy-s', storage: { eiti_locale: loc, theme: 'paper-light' } });
    await page.evaluate(() => openPhoneScreenMode());
    await expect(page.locator('#view-phone-screen .subview-title')).toHaveText(title);
    expect(await page.locator('#view-phone-screen').innerText()).not.toMatch(CYR);
    if (loc === 'en') await shot(page, 'settings-en-light-412');
  });
}

test('модалки и полноэкранные режимы получают те же отступы (без пресета — как раньше)', async ({ page }) => {
  const probe = () => page.evaluate(() => {
    const m = document.createElement('div'); m.className = 'modal'; m.style.display = 'block'; document.body.appendChild(m);
    const cs = getComputedStyle(m), r = [parseFloat(cs.paddingTop), parseFloat(cs.paddingBottom)]; m.remove();
    return r;
  });
  await boot(page);
  const base = await probe();
  await page.evaluate(() => { localStorage.setItem('eiti_phone_screen', 'iphone-notch'); window.eitiPhoneScreenApply('iphone-notch'); });
  const p = await probe();
  expect(p[0]).toBe(20 + 47); expect(p[1]).toBe(20 + 34);
  await page.evaluate(() => window.eitiPhoneScreenApply('auto'));
  expect(await probe()).toEqual(base);
});
