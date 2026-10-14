// @ts-check
const { test, expect } = require('@playwright/test');

// Cross-AI context continuity — the "Perplexity effect".
//
// When the user switches providers, the *new* model still receives what the
// previous conversation contained. The DeepSeek request's `history` is built
// from the L0 memory cache (the global `window.eitiL0`), so a prior turn placed
// there must reach the outgoing request. This logic lives inside the large
// eitiAskDeepSeek() function (DOM + fetch), so it cannot be unit-tested via the
// read-only harness; here we drive the real app and intercept the request.
//
// Note: the human-readable "who-said-what" transcript with provider labels is
// built from a lexically-scoped `chatLog` that is not settable from outside the
// page, so this test asserts the substance — the prior turn's *content* reaches
// the new provider — rather than the label formatting.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('eiti_onboarded', 'true');
  });
});

async function waitForApp(page) {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => typeof window.eitiAskDeepSeek === 'function', null,
    { timeout: 15_000 });
}

test('a DeepSeek request carries the prior (Gemini) turn from L0 memory', async ({ page }) => {
  await waitForApp(page);

  // Capture the whole outgoing message array and fulfil with a canned SSE reply
  // so the network call never leaves the machine.
  const captured = { messages: null };
  await page.route('https://api.deepseek.com/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON();
    captured.messages = body.messages || [];
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"choices":[{"delta":{"content":"ок"}}]}\n\ndata: [DONE]\n\n',
    });
  });

  const PRIOR = 'Запутанность — корреляция состояний частиц.';

  // Seed the L0 memory cache with a prior turn (answered by Gemini), switch the
  // active provider to DeepSeek, and send a follow-up. eitiAskDeepSeek builds its
  // `history` from window.eitiL0, so that prior turn must reach the request.
  await page.evaluate((prior) => {
    localStorage.setItem('eiti_ai_provider', 'deepseek');
    localStorage.setItem('deepseek_api_key', window._obfKey('sk-test-key-123'));
    localStorage.removeItem('eiti_ds_off');
    // Strict memory mode is off by default; pin it off so the provider is
    // always called (strict mode could otherwise block on the Truth Gate).
    localStorage.setItem('eiti_strict_memory_mode', '0');
    window.eitiL0 = [
      { role: 'user', content: 'давай обсудим квантовую запутанность',
        created: new Date(Date.now() - 3000).toISOString(), importance: 1 },
      { role: 'assistant', content: prior, provider: 'gemini',
        created: new Date(Date.now() - 2000).toISOString(), importance: 1 },
    ];
  }, PRIOR);

  await page.evaluate(() => window.eitiAskDeepSeek('а теперь подробнее'));
  await expect.poll(() => captured.messages, { timeout: 10_000 }).not.toBeNull();

  // The new model (DeepSeek) must receive the previous Gemini answer somewhere in
  // its request — that is what makes switching providers seamless.
  const allContent = (captured.messages || []).map((m) => m.content || '').join('\n');
  expect(allContent).toContain(PRIOR);
  // And the follow-up the user just sent is present as the final user turn.
  const lastUser = [...(captured.messages || [])].reverse().find((m) => m.role === 'user');
  expect(lastUser && lastUser.content).toContain('а теперь подробнее');
});
