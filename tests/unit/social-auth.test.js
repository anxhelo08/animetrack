import { test, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { mountSocialAuth } from '../../src/modules/social-auth.js';

function setup(external = { google: true, apple: true }, result) {
  const dom = new JSDOM(
    '<div id="auth"><button data-social-provider="google"><small class="social-availability"></small></button><button data-social-provider="apple"><small class="social-availability"></small></button><p data-social-status></p></div>',
  );
  const client = {
    auth: {
      signInWithOAuth: vi.fn(
        async ({ provider }) =>
          result || {
            data: { url: 'https://auth.example/auth/v1/authorize?provider=' + provider },
            error: null,
          },
      ),
    },
  };
  const navigate = vi.fn(),
    feedback = vi.fn();
  const flow = mountSocialAuth({
    root: dom.window.document.getElementById('auth'),
    config: { url: 'https://auth.example', key: 'public-test' },
    client: () => client,
    redirect: () => 'https://app.example/',
    feedback,
    navigate,
    fetcher: vi.fn(async () => ({ ok: true, json: async () => ({ external }) })),
  });
  return { flow, client, navigate, feedback, dom };
}

test.each(['google', 'apple'])(
  '%s uses the existing Supabase session flow and fixed return URL',
  async (provider) => {
    const s = setup();
    await s.flow.refresh();
    await s.flow.signIn(provider);
    expect(s.client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider,
      options: { redirectTo: 'https://app.example/', skipBrowserRedirect: true },
    });
    expect(s.navigate).toHaveBeenCalledWith(
      'https://auth.example/auth/v1/authorize?provider=' + provider,
    );
    s.dom.window.close();
  },
);

test('disabled providers cannot send visitors into an unavailable login flow', async () => {
  const s = setup({ google: false, apple: false });
  await s.flow.refresh();
  await s.flow.signIn('google');
  expect(s.client.auth.signInWithOAuth).not.toHaveBeenCalled();
  expect(s.dom.window.document.querySelector('[data-social-provider="google"]').disabled).toBe(
    true,
  );
  expect(s.dom.window.document.querySelector('[data-social-status]').textContent).toContain(
    'email',
  );
  s.dom.window.close();
});

test.each([
  'https://evil.example/auth/v1/authorize',
  'javascript:alert(1)',
  'https://auth.example/unsafe',
])('rejects an unexpected provider redirect: %s', async (url) => {
  const s = setup(undefined, { data: { url }, error: null });
  await s.flow.refresh();
  await s.flow.signIn('apple');
  expect(s.navigate).not.toHaveBeenCalled();
  expect(s.feedback).toHaveBeenLastCalledWith(expect.stringContaining('email'), 'error');
  expect(s.dom.window.document.querySelector('[data-social-provider="apple"]').disabled).toBe(
    false,
  );
  s.dom.window.close();
});
