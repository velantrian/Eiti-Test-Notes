// v14.4.0: offline replies (no AI key) follow the app/message language — RU / EN / DE.
// One chat per UI language, each message hits a different offline layer: EITI Local calc + notes, KB, offline dialogs, no-key fallback.
const { test, expect } = require('@playwright/test');

const CYR = /[а-яё]/i;
async function boot(page, loc) {
  await page.addInitScript((l) => {
    localStorage.setItem('eiti_onboarded', 'true'); localStorage.setItem('eiti_toured_v7', '1'); localStorage.setItem('eiti_install_hint_seen', '1');
    localStorage.setItem('eiti_ai_provider', 'deepseek'); localStorage.removeItem('deepseek_api_key'); localStorage.setItem('eiti_offline_mode', '0');
    localStorage.setItem('eiti_locale', l); localStorage.setItem('eiti_ai_reply_lang', 'auto');
  }, loc);
  await page.goto('/index.html');
  await page.waitForFunction(() => !!window.EitiLocalLib && typeof eitiDb !== 'undefined' && !!eitiDb);
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

test.describe('v14.4.0 offline language', () => {
  test.setTimeout(240000);

  test('RU UI: Russian stays Russian, English input gets English', async ({ page }) => {
    await boot(page, 'ru');
    expect(await ask(page, 'сколько у меня заметок')).toMatch(/У тебя \d+ замет/);
    expect(await ask(page, 'два умножить на три')).toContain('2 × 3 = 6');
    expect(await ask(page, 'привет')).toMatch(CYR);
    expect(await ask(page, 'how many notes do i have')).toMatch(/You have \d+ notes?/);
    expect(await ask(page, 'hello')).not.toMatch(CYR);
    expect(await ask(page, 'фываолдж')).toContain('Настройте DeepSeek API ключ');
  });

  test('EN UI: every layer answers in English', async ({ page }) => {
    await boot(page, 'en');
    expect(await ask(page, '12*7')).toContain('12 × 7 = 84');
    const notes = await ask(page, 'how many notes do i have');
    expect(notes).toMatch(/You have \d+ notes?/);
    const kb = await ask(page, 'why is the sky blue');
    expect(kb).not.toMatch(CYR);
    const hi = await ask(page, 'hello');
    expect(hi).not.toMatch(CYR);
    const fb = await ask(page, 'qwrtzp blorf');
    expect(fb).toContain('Set up a DeepSeek API key');
    expect(fb).not.toMatch(CYR);
  });

  test('DE UI: German templates for calc, notes, core dialogs; English fallback, never Russian', async ({ page }) => {
    await boot(page, 'de');
    expect(await ask(page, 'was ist sieben mal acht')).toContain('7 × 8 = 56');
    expect(await ask(page, 'zwanzig prozent von dreihundert')).toContain('20% von 300 = 60');
    expect(await ask(page, 'wie viele notizen habe ich')).toMatch(/Du hast \d+ Notiz/);
    const hi = await ask(page, 'hallo, wie geht es dir?');
    expect(hi).not.toMatch(CYR);
    expect(hi).toMatch(/Hallo|Wie|dir|danke|Prima|gut gelaunt/i);
    expect(await ask(page, 'kannst du mir helfen')).toContain('Offline kann ich');
    expect(await ask(page, 'danke')).toMatch(/Gern geschehen|Ich helfe gern|Jederzeit/);
    const joke = await ask(page, 'erzähl mir einen witz');
    expect(joke).not.toMatch(CYR);
    const fb = await ask(page, 'qwrtzp blorf');
    expect(fb).toContain('Darauf habe ich offline keine Antwort');
    expect(fb).not.toMatch(CYR);
  });
});
