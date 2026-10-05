/*
 * Zyran public configuration
 *
 * This file is intentionally safe to publish. Never put API keys, payment secrets,
 * bot tokens, passwords, or other private values here. After the backend and external
 * services are deployed, fill in the public URLs and enable only the features that are
 * actually available.
 */
window.ZYRAN_CONFIG = Object.freeze({
  siteUrl: 'https://zyran.ir',
  apiBase: 'https://api.zyran.ir',

  server: Object.freeze({
    ready: false,
    address: '',
    maxPlayers: 200,
    versions: Object.freeze({
      survival: 'پس از راه‌اندازی اعلام می‌شود',
      bedwars: '1.8.9'
    })
  }),

  features: Object.freeze({
    serverStatus: false,
    auth: false,
    feedback: false,
    shop: false,
    payments: false,
    donations: false,
    downloads: false,
    telegram: false,
    discord: false
  }),

  links: Object.freeze({
    telegramBot: '',
    telegramChannel: '',
    discord: '',
    donation: ''
  }),

  /*
   * Add only verified HTTPS sources after reviewing license and compatibility:
   * { id: 'example', name: 'نام فایل', description: '...', url: 'https://official.example/file' }
   */
  downloads: Object.freeze([]),

  /* Public display catalog. The backend remains the source of truth for every price. */
  shopPacks: Object.freeze({
    vip: Object.freeze({ name: 'پک وی‌آی‌پی', price: 49000 }),
    hero: Object.freeze({ name: 'پک قهرمان', price: 99000 }),
    legend: Object.freeze({ name: 'پک افسانه‌ای', price: 169000 })
  })
});
