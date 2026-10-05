import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearSessionCookie,
  hashPassword,
  readCookie,
  secureCode,
  sessionCookie,
  verifyPassword
} from '../src/security.js';

test('password hashes verify the right password only', async () => {
  const encoded = await hashPassword('a-long-test-password-123');
  assert.match(encoded, /^pbkdf2_sha256\$310000\$/);
  assert.equal(await verifyPassword('a-long-test-password-123', encoded), true);
  assert.equal(await verifyPassword('wrong-password', encoded), false);
  assert.equal(await verifyPassword('anything', 'invalid'), false);
});

test('session cookies are secure and HttpOnly', () => {
  const cookie = sessionCookie('secret-token', 120);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(clearSessionCookie(), /Max-Age=0/);
});

test('cookies are parsed by exact name', () => {
  const request = new Request('https://api.zyran.ir', {
    headers: { cookie: 'theme=dark; zyran_session=abc%20123; other=value' }
  });
  assert.equal(readCookie(request, 'zyran_session'), 'abc 123');
  assert.equal(readCookie(request, 'missing'), '');
});

test('secure codes contain the expected prefix and URL-safe characters', () => {
  const code = secureCode('ZY-', 8);
  assert.match(code, /^ZY-[A-Z0-9]+$/);
  assert.ok(code.length >= 10);
});
