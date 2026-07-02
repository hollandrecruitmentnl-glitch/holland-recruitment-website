/**
 * Cookie-banner — Holland Recruitment (AVG-compliant)
 *
 * Toont banner bij eerste bezoek. Slaat keuze op in localStorage.
 * Laadt GA4 + Microsoft Clarity pas NA opt-in voor analytics.
 *
 * Integratie: <script src="/cookie-banner.js" defer></script>
 *   toevoegen aan <head> of vlak vóór </body> op elke HTML-pagina.
 *
 * Reset door user: window.HRCookies.reset() in browser-console.
 * Voorkeuren openen: link naar #cookie-preferences of window.HRCookies.open()
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'hr-cookie-consent';
  const VERSION = 1;

  // GA4 + Clarity IDs — LIVE per 2 jul 2026
  const GA4_MEASUREMENT_ID = 'G-KXL09YSF9N';
  const CLARITY_PROJECT_ID = 'wvk55mww7c';

  function getConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.version !== VERSION) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(prefs) {
    const record = {
      version: VERSION,
      timestamp: new Date().toISOString(),
      essential: true,
      analytics: !!prefs.analytics,
      marketing: !!prefs.marketing
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (e) {
      console.warn('[cookie-banner] localStorage niet beschikbaar');
    }
    applyConsent(record);
    return record;
  }

  function applyConsent(record) {
    if (record.analytics) {
      loadGA4();
      loadClarity();
    }
  }

  function loadGA4() {
    if (window.__ga4Loaded || GA4_MEASUREMENT_ID.includes('XXXX')) return;
    window.__ga4Loaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA4_MEASUREMENT_ID, { anonymize_ip: true });
  }

  function loadClarity() {
    if (window.__clarityLoaded || CLARITY_PROJECT_ID.includes('XXXX')) return;
    window.__clarityLoaded = true;
    (function(c, l, a, r, i, t, y) {
      c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID);
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .hr-cookie-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(21, 24, 58, 0.45);
        z-index: 999998;
        opacity: 0;
        transition: opacity 0.25s ease;
        pointer-events: none;
      }
      .hr-cookie-backdrop.is-open { opacity: 1; pointer-events: auto; }

      .hr-cookie-banner {
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%) translateY(20px);
        max-width: 720px;
        width: calc(100% - 32px);
        background: #FFFFFF;
        border: 1px solid #ECE5D6;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(21, 24, 58, 0.15);
        padding: 24px;
        z-index: 999999;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #15183A;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
        pointer-events: none;
      }
      .hr-cookie-banner.is-open {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
        pointer-events: auto;
      }

      .hr-cookie-banner__title {
        font-family: 'Poppins', 'Inter', sans-serif;
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 6px 0;
        line-height: 1.3;
      }
      .hr-cookie-banner__body {
        font-size: 14px;
        line-height: 1.5;
        color: #3a3d5e;
        margin: 0 0 16px 0;
      }
      .hr-cookie-banner__body a {
        color: #3551E6;
        text-decoration: underline;
      }
      .hr-cookie-banner__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .hr-cookie-btn {
        appearance: none;
        border: 1px solid #ECE5D6;
        border-radius: 10px;
        padding: 10px 16px;
        font-family: 'Poppins', 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: #FFFFFF;
        color: #15183A;
        transition: all 0.15s;
      }
      .hr-cookie-btn:hover {
        background: #FBF6EC;
        border-color: #5C6178;
      }
      .hr-cookie-btn--primary {
        background: #3551E6;
        color: #FFFFFF;
        border-color: #3551E6;
      }
      .hr-cookie-btn--primary:hover {
        background: #2a44c9;
        border-color: #2a44c9;
      }
      .hr-cookie-btn--ghost {
        border-color: transparent;
        color: #5C6178;
      }

      /* Preferences panel */
      .hr-cookie-prefs {
        display: none;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #ECE5D6;
      }
      .hr-cookie-prefs.is-open { display: block; }
      .hr-cookie-pref-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid #ECE5D6;
      }
      .hr-cookie-pref-row:last-child { border-bottom: none; }
      .hr-cookie-pref-label {
        flex: 1;
      }
      .hr-cookie-pref-label strong {
        display: block;
        font-size: 14px;
        color: #15183A;
        margin-bottom: 2px;
      }
      .hr-cookie-pref-label span {
        font-size: 12px;
        color: #5C6178;
        line-height: 1.4;
      }
      .hr-cookie-toggle {
        position: relative;
        width: 40px;
        height: 22px;
        background: #ECE5D6;
        border-radius: 22px;
        cursor: pointer;
        transition: background 0.2s;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .hr-cookie-toggle::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        background: #FFFFFF;
        border-radius: 50%;
        transition: transform 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      }
      .hr-cookie-toggle.is-active { background: #3551E6; }
      .hr-cookie-toggle.is-active::after { transform: translateX(18px); }
      .hr-cookie-toggle.is-locked {
        background: #D6F24E;
        cursor: not-allowed;
      }
      .hr-cookie-toggle.is-locked::after { transform: translateX(18px); }

      @media (max-width: 540px) {
        .hr-cookie-banner { padding: 20px; bottom: 16px; }
        .hr-cookie-banner__title { font-size: 16px; }
        .hr-cookie-banner__actions { flex-direction: column-reverse; }
        .hr-cookie-btn { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function createBanner() {
    const backdrop = document.createElement('div');
    backdrop.className = 'hr-cookie-backdrop';

    const banner = document.createElement('div');
    banner.className = 'hr-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'hr-cookie-title');
    banner.setAttribute('aria-describedby', 'hr-cookie-desc');
    banner.innerHTML = `
      <h2 class="hr-cookie-banner__title" id="hr-cookie-title">Cookies op holland-recruitment.nl</h2>
      <p class="hr-cookie-banner__body" id="hr-cookie-desc">
        Wij gebruiken essentiële cookies om de site te laten werken en (met jouw toestemming) analytics-cookies om te leren wat werkt. Geen advertentie-cookies, geen doorverkoop van data.
        Meer info in onze <a href="/privacyverklaring.html">privacyverklaring</a>.
      </p>

      <div class="hr-cookie-prefs" id="hr-cookie-prefs">
        <div class="hr-cookie-pref-row">
          <div class="hr-cookie-pref-label">
            <strong>Essentieel</strong>
            <span>Nodig om de website te laten werken. Kan niet uitgeschakeld.</span>
          </div>
          <div class="hr-cookie-toggle is-locked" title="Essentieel — altijd aan"></div>
        </div>
        <div class="hr-cookie-pref-row">
          <div class="hr-cookie-pref-label">
            <strong>Analytics</strong>
            <span>Anonieme statistieken (Google Analytics 4 + Microsoft Clarity) om te zien wat werkt op de site.</span>
          </div>
          <div class="hr-cookie-toggle" data-pref="analytics" role="switch" aria-label="Analytics" tabindex="0"></div>
        </div>
        <div class="hr-cookie-pref-row">
          <div class="hr-cookie-pref-label">
            <strong>Marketing</strong>
            <span>Momenteel niet in gebruik. Als we in de toekomst advertenties gaan meten, komt dat hier.</span>
          </div>
          <div class="hr-cookie-toggle" data-pref="marketing" role="switch" aria-label="Marketing" tabindex="0"></div>
        </div>
      </div>

      <div class="hr-cookie-banner__actions" style="margin-top:16px;">
        <button type="button" class="hr-cookie-btn hr-cookie-btn--ghost" data-action="essential-only">Alleen essentieel</button>
        <button type="button" class="hr-cookie-btn" data-action="prefs">Voorkeuren</button>
        <button type="button" class="hr-cookie-btn hr-cookie-btn--primary" data-action="accept-all" style="flex:1;">Accepteer alles</button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(banner);
    return { backdrop, banner };
  }

  function openBanner(banner, backdrop) {
    banner.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeBanner(banner, backdrop) {
    banner.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      try { banner.remove(); backdrop.remove(); } catch (e) {}
    }, 400);
  }

  function attachHandlers(banner, backdrop) {
    const prefsPanel = banner.querySelector('#hr-cookie-prefs');
    const state = { analytics: false, marketing: false };

    banner.querySelectorAll('.hr-cookie-toggle:not(.is-locked)').forEach(el => {
      const pref = el.dataset.pref;
      const toggle = () => {
        state[pref] = !state[pref];
        el.classList.toggle('is-active', state[pref]);
        el.setAttribute('aria-checked', state[pref] ? 'true' : 'false');
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      });
    });

    banner.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'accept-all') {
          saveConsent({ analytics: true, marketing: true });
          closeBanner(banner, backdrop);
        } else if (action === 'essential-only') {
          saveConsent({ analytics: false, marketing: false });
          closeBanner(banner, backdrop);
        } else if (action === 'prefs') {
          prefsPanel.classList.toggle('is-open');
          btn.textContent = prefsPanel.classList.contains('is-open') ? 'Verberg voorkeuren' : 'Voorkeuren';
          if (prefsPanel.classList.contains('is-open')) {
            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'hr-cookie-btn hr-cookie-btn--primary';
            saveBtn.textContent = 'Sla voorkeuren op';
            saveBtn.style.marginTop = '16px';
            saveBtn.style.width = '100%';
            saveBtn.dataset.action = 'save-prefs';
            saveBtn.addEventListener('click', () => {
              saveConsent(state);
              closeBanner(banner, backdrop);
            });
            if (!prefsPanel.querySelector('[data-action="save-prefs"]')) {
              prefsPanel.appendChild(saveBtn);
            }
          }
        }
      });
    });
  }

  function init() {
    createStyles();
    const consent = getConsent();
    if (consent) {
      applyConsent(consent);
      return; // banner niet tonen — al beslist
    }
    const { banner, backdrop } = createBanner();
    attachHandlers(banner, backdrop);
    setTimeout(() => openBanner(banner, backdrop), 350);
  }

  // Public API — voor "cookies opnieuw beheren" link
  window.HRCookies = {
    reset: function() {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    },
    open: function() {
      const existing = document.querySelector('.hr-cookie-banner');
      if (existing) return;
      localStorage.removeItem(STORAGE_KEY);
      init();
    },
    getConsent: getConsent
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
