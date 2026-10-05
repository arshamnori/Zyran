(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const config = window.ZYRAN_CONFIG || {};
    const host = document.getElementById('verifiedDownloads');
    const empty = document.getElementById('downloadsEmpty');
    if (!host || !empty || !config.features?.downloads) return;

    const items = Array.isArray(config.downloads)
      ? config.downloads.filter(item => {
          try { return new URL(item.url).protocol === 'https:' && item.name && item.description; }
          catch (_) { return false; }
        })
      : [];
    if (!items.length) return;

    host.replaceChildren();
    items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'dl-card';
      const kind = document.createElement('span');
      kind.className = 'dl-kind';
      kind.textContent = 'تأییدشده';
      const title = document.createElement('h2');
      title.textContent = item.name;
      const description = document.createElement('p');
      description.textContent = item.description;
      const link = document.createElement('a');
      link.className = 'dl-btn';
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'دانلود از منبع رسمی';
      card.append(kind, title, description, link);
      host.appendChild(card);
    });
    empty.hidden = true;
    host.hidden = false;
  });
})();
