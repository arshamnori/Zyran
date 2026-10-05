import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, allowedOrigin, assertText, readJson, responseHeaders } from '../src/http.js';

const env = { ALLOWED_ORIGINS: 'https://zyran.ir,http://localhost:8000' };

test('CORS echoes allowed origins and rejects unknown origins', () => {
  const allowedRequest = new Request('https://api.zyran.ir', { headers: { origin: 'https://zyran.ir' } });
  const deniedRequest = new Request('https://api.zyran.ir', { headers: { origin: 'https://evil.example' } });
  assert.equal(allowedOrigin(allowedRequest, env), 'https://zyran.ir');
  assert.equal(allowedOrigin(deniedRequest, env), null);
  assert.equal(responseHeaders(allowedRequest, env)['Access-Control-Allow-Credentials'], 'true');
});

test('JSON reader accepts JSON and rejects other content types', async () => {
  const request = new Request('https://api.zyran.ir', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true })
  });
  assert.deepEqual(await readJson(request), { ok: true });

  const invalid = new Request('https://api.zyran.ir', { method: 'POST', body: 'hello' });
  await assert.rejects(() => readJson(invalid), error => error instanceof HttpError && error.status === 415);
});

test('text validation trims and enforces bounds', () => {
  assert.equal(assertText('  hello  ', 'field', 2, 10), 'hello');
  assert.throws(() => assertText('x', 'field', 2, 10), HttpError);
});
