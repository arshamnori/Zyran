const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
};

export class HttpError extends Error {
  constructor(status, code, message, headers = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export function allowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return '';
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

export function responseHeaders(request, env, extra = {}) {
  const origin = allowedOrigin(request, env);
  const cors = origin ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Vary': 'Origin'
  } : {};
  return { ...BASE_HEADERS, ...cors, ...extra };
}

export function json(request, env, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(request, env, extraHeaders)
  });
}

export function errorResponse(request, env, error) {
  if (error instanceof HttpError) {
    return json(request, env, { code: error.code, message: error.message }, error.status, error.headers);
  }
  console.error('[zyran-api] unexpected error', error);
  return json(request, env, { code: 'internal_error', message: 'خطای داخلی سرور رخ داد.' }, 500);
}

export async function readJson(request, maxBytes = 32_768) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'json_required', 'بدنه درخواست باید JSON باشد.');
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw new HttpError(413, 'payload_too_large', 'حجم درخواست بیش از حد مجاز است.');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, 'payload_too_large', 'حجم درخواست بیش از حد مجاز است.');
  }
  try {
    return JSON.parse(text || '{}');
  } catch (_) {
    throw new HttpError(400, 'invalid_json', 'ساختار JSON معتبر نیست.');
  }
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function assertText(value, fieldName, min, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min || text.length > max) {
    throw new HttpError(422, 'validation_error', `${fieldName} باید بین ${min} و ${max} نویسه باشد.`);
  }
  return text;
}
