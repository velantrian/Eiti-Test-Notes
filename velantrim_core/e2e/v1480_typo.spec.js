// v14.8.0: offline typo tolerance in the real chat (no AI key): calculator, intents, layout, German folding; lazy vocab.
const { test, expect } = require('@playwright/test');

async function boot(page, loc) {
  await page.addInitScript((l) => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek'); localStorage.removeItem('deepseek_api_key'); localStorage.setItem('eiti_offline_mode', '0');
    localStorage.setItem('eiti_locale', l); localStorage.setItem('eiti_ai_reply_lang', 'auto');
  }, loc);
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.EitiTypo && !!window.EitiTypoHost && !!window.EitiDialogHost && typeof eitiDb !== 'undefined' && !!eitiDb);
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

test.describe('v14.8.0 typo tolerance', () => {
  test.setTimeout(240000);

  test('vocab is not fetched at startup, only on first offline message', async ({ page }) => {
    const urls = [];
    page.on('request', (r) => urls.push(r.url()));
    await boot(page, 'ru');
    await page.waitForTimeout(1500);
    expect(urls.filter((u) => u.includes('eiti_typo_vocab.json'))).toEqual([]);
    expect(await page.evaluate(() => EitiTypo.loaded())).toBe(false);
    expect(await ask(page, 'два умнжить на три')).toContain('6');
    expect(urls.filter((u) => u.includes('eiti_typo_vocab.json')).length).toBe(1);
  });

  test('RU: calculator, notes count, layout hint, joke', async ({ page }) => {
    await boot(page, 'ru');
    expect(await ask(page, 'сколко будет пять пюлс семь')).toContain('12');
    expect(await ask(page, 'ghbdtn')).toContain('понял как: «привет»');
    const j = await ask(page, 'расскжи анекдот');
    expect(j.length).toBeGreaterThan(10);
    expect(j).not.toContain('понял как');
    expect(await page.evaluate(() => EitiTypo.correct('еше', 'ru').text)).toBe('ещё');
  });

  test('EN + DE: typos and folded umlauts', async ({ page }) => {
    await boot(page, 'en');
    expect(await ask(page, 'what is twelve timse seven')).toContain('84');
    expect(await page.evaluate(() => [EitiTypo.correct('Wasser neue Strasse', 'de').text, EitiTypo.correct('Tatigkeit', 'de').text]))
      .toEqual(['Wasser neue Strasse', 'Tätigkeit']);
    expect(await ask(page, 'was ist siben mal acht')).toContain('56');
  });
});
