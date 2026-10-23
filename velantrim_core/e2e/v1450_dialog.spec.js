// v14.5.0: offline dialogue state in the real chat (no AI key): references, topic stack, trip frame, clarify.
const { test, expect } = require('@playwright/test');

async function boot(page, loc) {
  await page.addInitScript((l) => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek'); localStorage.removeItem('deepseek_api_key'); localStorage.setItem('eiti_offline_mode', '0');
    localStorage.setItem('eiti_locale', l); localStorage.setItem('eiti_ai_reply_lang', 'auto');
  }, loc);
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.EitiDState && !!window.EitiDialogHost && typeof eitiDb !== 'undefined' && !!eitiDb);
  await page.addStyleTag({ content: '#eiti-pin-modal{display:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()); localStorage.removeItem('eiti_ds_off'); });
}
async function ask(page, q) {
  const msgs = page.locator('#messages .message.incoming');
  const n = await msgs.count();
  await page.locator('#input').fill(q);
  await page.locator('#send').click();
  await expect.poll(() => msgs.count(), { timeout: 45000 }).toBeGreaterThan(n);
  await page.waitForTimeout(400);
  return (await msgs.last().innerText()).replace(/\s+/g, ' ');
}
const lastQ = (page) => page.evaluate(() => window._eitiDStateLastQ);

test.describe('v14.5.0 dialogue state', () => {
  test.setTimeout(240000);

  test('RU: Грузия → там / тогда / туда, о чём говорили, вернёмся к', async ({ page }) => {
    await boot(page, 'ru');
    expect(await ask(page, 'Хочу в Грузию весной')).toContain('Грузия, весной');
    const see = await ask(page, 'а что там посмотреть?');
    expect(await lastQ(page)).toBe('а что в Грузии посмотреть?');
    expect(see.length).toBeGreaterThan(5);
    await ask(page, 'а какая там погода тогда?');
    expect(await lastQ(page)).toBe('а какая в Грузии погода весной?');
    await ask(page, 'кто такой Наполеон');
    await ask(page, 'когда он родился?');
    expect(await lastQ(page)).toBe('когда Наполеон родился?');
    expect(await ask(page, 'о чём мы говорили?')).toMatch(/Наполеон.*Грузи/);
    expect(await ask(page, 'вернёмся к Грузии')).toContain('вернёмся к разговору о Грузии');
    await ask(page, 'а что туда взять?');
    expect(await lastQ(page)).toBe('а что в Грузию взять?');
    // persisted in IndexedDB (eiti_offline → kv 'dstate'), survives reload
    await page.waitForTimeout(800);
    await page.reload();
    await page.waitForFunction(() => !!window.EitiDialogHost && typeof eitiDb !== 'undefined' && !!eitiDb);
    await page.evaluate(() => document.querySelectorAll('#eiti-onboarding,#eiti-pin-modal,.toast').forEach((e) => e.remove()));
    await ask(page, 'что там посмотреть?');
    expect(await lastQ(page)).toBe('что в Грузии посмотреть?');
    // a new vacation without a place does not reuse the old Georgia plan
    expect(await ask(page, 'хочу в отпуск')).toContain('Куда');
    expect(await ask(page, 'в Италию')).toContain('Когда');
    expect(await ask(page, 'летом')).toContain('Италия, летом');
  });

  test('RU: поездка без места — фрейм с уточнениями; выбор между вариантами', async ({ page }) => {
    await boot(page, 'ru');
    expect(await ask(page, 'хочу в отпуск')).toContain('Куда');
    expect(await ask(page, 'в Италию')).toContain('Когда');
    expect(await ask(page, 'летом')).toContain('Италия, летом');
    expect(await ask(page, 'что лучше купить: айфон или андроид?')).toMatch(/айфон|андроид/i);
    expect(await ask(page, 'цена')).toMatch(/айфон|андроид/i);
  });

  test('EN: did you mean X or Y?', async ({ page }) => {
    await boot(page, 'en');
    await ask(page, 'tell me about Einstein');
    expect(await ask(page, 'I want to travel to Japan in spring')).toContain('Japan, in spring');
    expect(await ask(page, 'what is it famous for?')).toMatch(/Do you mean .*Einstein.*Japan/);
    await ask(page, 'the first one');
    expect(await lastQ(page)).toMatch(/Einstein/);
  });

  test('DE: dort / worüber haben wir gesprochen', async ({ page }) => {
    await boot(page, 'de');
    expect(await ask(page, 'Ich möchte im Sommer nach Italien reisen')).toContain('Italien, im Sommer');
    await ask(page, 'was kann man dort sehen?');
    expect(await lastQ(page)).toBe('was kann man in Italien sehen?');
    expect(await ask(page, 'worüber haben wir gesprochen?')).toContain('Italien');
  });
});
