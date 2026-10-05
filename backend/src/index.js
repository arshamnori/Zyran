import {
  HttpError,
  allowedOrigin,
  assertText,
  clientIp,
  errorResponse,
  json,
  readJson,
  responseHeaders
} from './http.js';
import {
  checkRateLimit,
  clearSessionCookie,
  createSession,
  deleteSession,
  getSessionUser,
  hashPassword,
  secureCode,
  sessionCookie,
  verifyPassword
} from './security.js';

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    minecraftUsername: user.minecraft_username || null,
    role: user.role
  };
}

function publicPack(pack) {
  return {
    slug: pack.slug,
    name: pack.name,
    priceToman: pack.price_toman,
    description: pack.description,
    active: Boolean(pack.active)
  };
}

async function requireUser(env, request) {
  const user = await getSessionUser(env.DB, request);
  if (!user) throw new HttpError(401, 'authentication_required', 'برای ادامه وارد حساب شو.');
  return user;
}

async function requireAdmin(env, request) {
  const user = await requireUser(env, request);
  if (user.role !== 'admin') throw new HttpError(403, 'admin_required', 'دسترسی ادمین لازم است.');
  return user;
}

async function enforceRateLimit(env, request, scope, limit, windowSeconds) {
  const result = await checkRateLimit(env.DB, `${scope}:${clientIp(request)}`, limit, windowSeconds);
  if (!result.allowed) {
    throw new HttpError(429, 'rate_limited', 'تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کن.', {
      'Retry-After': String(result.retryAfter)
    });
  }
}

async function serverStatus(env) {
  if (env.SERVER_READY !== 'true') {
    return { online: false, playersOnline: 0, maxPlayers: 0, version: null, state: 'launching' };
  }
  if (!env.STATUS_PROVIDER_URL) {
    return { online: false, playersOnline: 0, maxPlayers: 0, version: null, state: 'unavailable' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(env.STATUS_PROVIDER_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`status provider returned ${response.status}`);
    const payload = await response.json();
    return {
      online: Boolean(payload.online),
      playersOnline: Number(payload.playersOnline ?? payload.players?.online ?? 0),
      maxPlayers: Number(payload.maxPlayers ?? payload.players?.max ?? 0),
      version: payload.version?.name ?? payload.version ?? null,
      state: payload.online ? 'online' : 'offline'
    };
  } catch (error) {
    console.error('[zyran-api] status provider failed', error);
    return { online: false, playersOnline: 0, maxPlayers: 0, version: null, state: 'unavailable' };
  }
}

async function register(request, env) {
  await enforceRateLimit(env, request, 'register', 5, 3600);
  const body = await readJson(request);
  const username = assertText(body.username, 'نام کاربری', 3, 24);
  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    throw new HttpError(422, 'invalid_username', 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، عدد و زیرخط باشد.');
  }
  const email = assertText(body.email, 'ایمیل', 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(422, 'invalid_email', 'ایمیل معتبر نیست.');
  }
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 12 || password.length > 128) {
    throw new HttpError(422, 'weak_password', 'رمز عبور باید بین ۱۲ تا ۱۲۸ نویسه باشد.');
  }
  if (password.toLowerCase().includes(username.toLowerCase())) {
    throw new HttpError(422, 'weak_password', 'رمز عبور نباید شامل نام کاربری باشد.');
  }
  const minecraftUsername = body.minecraftUsername
    ? assertText(body.minecraftUsername, 'نام کاربری ماینکرفت', 3, 24)
    : null;
  if (minecraftUsername && !/^[A-Za-z0-9_]+$/.test(minecraftUsername)) {
    throw new HttpError(422, 'invalid_minecraft_username', 'نام کاربری ماینکرفت معتبر نیست.');
  }

  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE username_normalized = ? OR email = ?'
  ).bind(username.toLowerCase(), email).first();
  if (existing) throw new HttpError(409, 'account_exists', 'این نام کاربری یا ایمیل قبلاً ثبت شده است.');

  const now = Math.floor(Date.now() / 1000);
  const passwordHash = await hashPassword(password);
  try {
    const result = await env.DB.prepare(`
      INSERT INTO users (username, username_normalized, email, minecraft_username, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, 'user', ?)
    `).bind(username, username.toLowerCase(), email, minecraftUsername, passwordHash, now).run();
    return json(request, env, { created: true, userId: result.meta.last_row_id }, 201);
  } catch (error) {
    if (String(error.message).toLowerCase().includes('unique')) {
      throw new HttpError(409, 'account_exists', 'این نام کاربری یا ایمیل قبلاً ثبت شده است.');
    }
    throw error;
  }
}

async function login(request, env) {
  await enforceRateLimit(env, request, 'login', 10, 900);
  const body = await readJson(request);
  const username = assertText(body.username, 'نام کاربری', 3, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || password.length > 128) {
    throw new HttpError(401, 'invalid_credentials', 'نام کاربری یا رمز عبور اشتباه است.');
  }

  const user = await env.DB.prepare(`
    SELECT id, username, email, minecraft_username, password_hash, role
    FROM users WHERE username_normalized = ? OR email = ?
  `).bind(username, username).first();
  const valid = user
    ? await verifyPassword(password, user.password_hash)
    : (await hashPassword(password), false);
  if (!valid) throw new HttpError(401, 'invalid_credentials', 'نام کاربری یا رمز عبور اشتباه است.');

  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? OR expires_at <= ?')
    .bind(user.id, Math.floor(Date.now() / 1000)).run();
  const session = await createSession(env.DB, user.id);
  return json(request, env, { authenticated: true, user: publicUser(user) }, 200, {
    'Set-Cookie': sessionCookie(session.token, session.maxAge)
  });
}

async function submitFeedback(request, env) {
  await enforceRateLimit(env, request, 'feedback', 5, 3600);
  const body = await readJson(request);
  const type = assertText(body.type || 'سایر', 'موضوع', 2, 40);
  const name = body.name ? assertText(body.name, 'نام', 1, 40) : null;
  const message = assertText(body.message, 'متن پیام', 10, 1000);
  const allowedTypes = new Set(['گزارش باگ', 'پیشنهاد گیم‌مود', 'پیشنهاد برای سایت', 'انتقاد', 'سایر']);
  if (!allowedTypes.has(type)) throw new HttpError(422, 'invalid_feedback_type', 'موضوع بازخورد معتبر نیست.');

  await env.DB.prepare(`
    INSERT INTO feedback (type, name, message, status, created_at)
    VALUES (?, ?, ?, 'new', ?)
  `).bind(type, name, message, Math.floor(Date.now() / 1000)).run();
  return json(request, env, { submitted: true }, 201);
}

async function listPacks(request, env, includeInactive = false) {
  const result = await env.DB.prepare(`
    SELECT slug, name, price_toman, description, active
    FROM packs ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY sort_order, id
  `).all();
  return json(request, env, result.results.map(publicPack));
}

async function createOrder(request, env, user) {
  if (env.ORDERING_ENABLED !== 'true') {
    throw new HttpError(503, 'ordering_disabled', 'ثبت سفارش هنوز فعال نشده است.');
  }
  await enforceRateLimit(env, request, `order:${user.id}`, 5, 3600);
  const body = await readJson(request);
  const itemIds = Array.isArray(body.items) ? [...new Set(body.items)] : [];
  if (!itemIds.length || itemIds.length > 10 || itemIds.some(id => typeof id !== 'string')) {
    throw new HttpError(422, 'invalid_items', 'اقلام سفارش معتبر نیستند.');
  }
  const customer = body.customer || {};
  const minecraftUsername = assertText(customer.minecraftUsername, 'نام کاربری ماینکرفت', 3, 24);
  const telegramId = assertText(customer.telegramId, 'آیدی تلگرام', 2, 64);
  const note = customer.note ? assertText(customer.note, 'توضیحات', 1, 500) : null;

  const placeholders = itemIds.map(() => '?').join(',');
  const result = await env.DB.prepare(`
    SELECT id, slug, name, price_toman FROM packs
    WHERE active = 1 AND slug IN (${placeholders})
  `).bind(...itemIds).all();
  if (result.results.length !== itemIds.length) {
    throw new HttpError(422, 'pack_unavailable', 'یکی از پک‌ها دیگر قابل سفارش نیست.');
  }
  const amount = result.results.reduce((sum, pack) => sum + Number(pack.price_toman), 0);
  const orderNumber = secureCode('ZY-', 7);
  const trackingCode = secureCode('', 8);
  const now = Math.floor(Date.now() / 1000);
  const insert = await env.DB.prepare(`
    INSERT INTO orders (
      order_number, tracking_code, user_id, amount_toman, status,
      minecraft_username, telegram_id, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?)
  `).bind(orderNumber, trackingCode, user.id, amount, minecraftUsername, telegramId, note, now, now).run();
  const orderId = insert.meta.last_row_id;
  await env.DB.batch(result.results.map(pack => env.DB.prepare(`
    INSERT INTO order_items (order_id, pack_id, pack_slug, pack_name, unit_price_toman, quantity)
    VALUES (?, ?, ?, ?, ?, 1)
  `).bind(orderId, pack.id, pack.slug, pack.name, pack.price_toman)));

  return json(request, env, { orderNumber, trackingCode, amountToman: amount, status: 'pending_payment' }, 201);
}

async function listMyOrders(request, env, user) {
  const result = await env.DB.prepare(`
    SELECT order_number, tracking_code, amount_toman, status, created_at
    FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
  `).bind(user.id).all();
  return json(request, env, result.results.map(order => ({
    orderNumber: order.order_number,
    trackingCode: order.tracking_code,
    amountToman: order.amount_toman,
    status: order.status,
    createdAt: new Date(order.created_at * 1000).toISOString()
  })));
}

async function listFeedback(request, env) {
  const result = await env.DB.prepare(`
    SELECT id, type, name, message, status, created_at
    FROM feedback ORDER BY created_at DESC LIMIT 200
  `).all();
  return json(request, env, result.results.map(item => ({
    id: item.id,
    type: item.type,
    name: item.name || 'ناشناس',
    message: item.message,
    status: item.status,
    createdAt: new Date(item.created_at * 1000).toISOString()
  })));
}

async function listReports(request, env) {
  const result = await env.DB.prepare(`
    SELECT id, title, body, created_at FROM admin_reports ORDER BY created_at DESC LIMIT 100
  `).all();
  return json(request, env, result.results.map(report => ({
    id: report.id,
    title: report.title,
    body: report.body,
    createdAt: new Date(report.created_at * 1000).toISOString()
  })));
}

async function createReport(request, env, user) {
  const body = await readJson(request);
  const title = assertText(body.title, 'عنوان', 3, 120);
  const reportBody = assertText(body.body, 'توضیحات', 5, 2000);
  await env.DB.prepare(`
    INSERT INTO admin_reports (title, body, author_id, created_at) VALUES (?, ?, ?, ?)
  `).bind(title, reportBody, user.id, Math.floor(Date.now() / 1000)).run();
  return json(request, env, { created: true }, 201);
}

async function updatePack(request, env, slug) {
  const body = await readJson(request);
  const price = Number(body.priceToman);
  if (!Number.isInteger(price) || price < 0 || price > 100_000_000) {
    throw new HttpError(422, 'invalid_price', 'قیمت معتبر نیست.');
  }
  if (typeof body.active !== 'boolean') {
    throw new HttpError(422, 'invalid_active_state', 'وضعیت فعال بودن پک معتبر نیست.');
  }
  const result = await env.DB.prepare(
    'UPDATE packs SET price_toman = ?, active = ?, updated_at = ? WHERE slug = ?'
  ).bind(price, body.active ? 1 : 0, Math.floor(Date.now() / 1000), slug).run();
  if (!result.meta.changes) throw new HttpError(404, 'pack_not_found', 'پک پیدا نشد.');
  return json(request, env, { updated: true });
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    if (allowedOrigin(request, env) === null) throw new HttpError(403, 'origin_not_allowed', 'Origin مجاز نیست.');
    return new Response(null, { status: 204, headers: responseHeaders(request, env) });
  }
  if (allowedOrigin(request, env) === null) throw new HttpError(403, 'origin_not_allowed', 'Origin مجاز نیست.');

  const now = Math.floor(Date.now() / 1000);
  ctx.waitUntil(Promise.all([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now).run(),
    env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(now - 86_400).run()
  ]).catch(() => {}));

  if (method === 'GET' && path === '/') return json(request, env, { service: 'zyran-api', healthy: true });
  if (method === 'GET' && path === '/health') return json(request, env, { healthy: true });
  if (method === 'GET' && path === '/status') return json(request, env, await serverStatus(env), 200, { 'Cache-Control': 'public, max-age=20' });

  if (method === 'POST' && path === '/auth/register') return register(request, env);
  if (method === 'POST' && path === '/auth/login') return login(request, env);
  if (method === 'POST' && path === '/auth/logout') {
    await deleteSession(env.DB, request);
    return json(request, env, { authenticated: false }, 200, { 'Set-Cookie': clearSessionCookie() });
  }
  if (method === 'GET' && path === '/auth/me') return json(request, env, publicUser(await requireUser(env, request)));

  if (method === 'POST' && path === '/feedback') return submitFeedback(request, env);
  if (method === 'GET' && path === '/shop/packs') return listPacks(request, env);
  if (method === 'POST' && path === '/shop/orders') return createOrder(request, env, await requireUser(env, request));
  if (method === 'GET' && path === '/shop/orders/me') return listMyOrders(request, env, await requireUser(env, request));

  if (method === 'GET' && path === '/admin/packs') {
    await requireAdmin(env, request);
    return listPacks(request, env, true);
  }
  if (method === 'GET' && path === '/admin/feedback') {
    await requireAdmin(env, request);
    return listFeedback(request, env);
  }
  if (method === 'GET' && path === '/admin/reports') {
    await requireAdmin(env, request);
    return listReports(request, env);
  }
  if (method === 'POST' && path === '/admin/reports') return createReport(request, env, await requireAdmin(env, request));
  const packMatch = path.match(/^\/admin\/packs\/([A-Za-z0-9_-]+)$/);
  if (method === 'PUT' && packMatch) {
    await requireAdmin(env, request);
    return updatePack(request, env, packMatch[1]);
  }

  throw new HttpError(404, 'not_found', 'مسیر موردنظر پیدا نشد.');
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (error) {
      return errorResponse(request, env, error);
    }
  }
};
