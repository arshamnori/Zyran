(function () {
  'use strict';

  const config = window.ZYRAN_CONFIG || {};
  const base = String(config.apiBase || '').replace(/\/$/, '');

  class ApiError extends Error {
    constructor(message, status, code) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code || 'api_error';
    }
  }

  async function request(path, options = {}) {
    if (!base) throw new ApiError('آدرس API تنظیم نشده است.', 0, 'api_not_configured');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
    const headers = new Headers(options.headers || {});
    let body = options.body;

    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }
    headers.set('Accept', 'application/json');

    try {
      const response = await fetch(base + path, {
        ...options,
        body,
        headers,
        credentials: 'include',
        signal: controller.signal
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : null;
      if (!response.ok) {
        throw new ApiError(
          data?.message || 'در ارتباط با سرور خطایی رخ داد.',
          response.status,
          data?.code
        );
      }
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new ApiError('زمان پاسخ‌گویی سرور بیش از حد طول کشید.', 0, 'timeout');
      }
      if (error instanceof ApiError) throw error;
      throw new ApiError('ارتباط با سرور برقرار نشد.', 0, 'network_error');
    } finally {
      clearTimeout(timeout);
    }
  }

  window.ZyranAPI = Object.freeze({
    ApiError,
    request,
    status: () => request('/status'),
    me: () => request('/auth/me'),
    login: (username, password) => request('/auth/login', {
      method: 'POST',
      body: { username, password }
    }),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    submitFeedback: (payload) => request('/feedback', { method: 'POST', body: payload }),
    packs: () => request('/shop/packs'),
    createOrder: (items, customer) => request('/shop/orders', {
      method: 'POST',
      body: { items, customer }
    }),
    myOrders: () => request('/shop/orders/me'),
    adminPacks: () => request('/admin/packs'),
    adminFeedback: () => request('/admin/feedback'),
    adminReports: () => request('/admin/reports'),
    createAdminReport: (payload) => request('/admin/reports', { method: 'POST', body: payload }),
    updatePack: (slug, payload) => request(`/admin/packs/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: payload
    })
  });
})();
