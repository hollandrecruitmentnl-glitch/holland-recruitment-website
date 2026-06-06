/**
 * Holland Recruitment — Conversion Optimizer Engine (Agent #287a)
 * Geen dependencies. Inline op elke pagina <script src="/conversion-engine.js" defer></script>
 *
 * Wat het doet:
 *  - Start session (1× per browser-tab)
 *  - Detect sector + side uit URL pattern
 *  - Triggers: exit-intent (mouseleave top), scroll-50, scroll-75, time-30, time-45
 *  - Vraag bij elke trigger Supabase select_popup → render branded modal
 *  - Track impressions/clicks/dismissals/leads via log_conversion_event
 *  - Sticky CTA op mobiel
 *  - Sanne-handoff: open #sanne chat met prefilled prompt
 */
(function(){
  'use strict';

  // Praat via n8n webhook (consistent met Sanne + intake) — geen Supabase key in publieke code
  const WEBHOOK_URL = 'https://hollandrecruitment.app.n8n.cloud/webhook/conversion-track';
  // Research-grounded constants (zie 01-RESEARCH-base.md):
  const FREQ_CAP_HOURS = 7 * 24;   // NN/g 2017: minimaal 7 dagen tussen popup-shows per type
  const MIN_DELAY_MS = 10 * 1000;  // NN/g 2017: geen popup binnen 5 sec; wij doen 10 sec safer
  const SCROLL_MILESTONES = [50, 75];  // Wisepops 2022: 50% en 75% scroll = highest-intent triggers
  const TIME_MILESTONES_SEC = [30, 45];  // Wisepops 2022: 30-45 sec sweet spot

  // ============ Helpers ============
  function uuid(){
    return (crypto.randomUUID && crypto.randomUUID()) ||
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8); return v.toString(16);
      });
  }
  function getSessionToken(){
    let t = sessionStorage.getItem('hr_conv_token');
    if (!t){ t = uuid(); sessionStorage.setItem('hr_conv_token', t); }
    return t;
  }
  function getQS(name){
    const m = new URLSearchParams(location.search); return m.get(name);
  }
  function detectSector(){
    const p = location.pathname.toLowerCase();
    if (p.includes('logistiek') || p.includes('warehouse')) return 'logistiek';
    if (p.includes('horeca') || p.includes('hotel') || p.includes('housekeeping')) return 'horeca';
    if (p.includes('zorg') || p.includes('care')) return 'zorg';
    if (p.includes('schoonmaak') || p.includes('cleaning')) return 'schoonmaak';
    if (p.includes('bouw') || p.includes('construction')) return 'bouw';
    if (p.includes('technisch') || p.includes('installateur')) return 'techniek';
    if (p.includes('administratief') || p.includes('admin')) return 'administratief';
    return 'all';
  }
  function detectSide(){
    const p = location.pathname.toLowerCase();
    if (p.includes('werkgever') || p.includes('personeel-aanvragen') ||
        p.includes('voor-werkgevers') || p.includes('tarieven')) return 'werkgever';
    if (p.includes('inschrijven') || p.includes('vacatures') ||
        p.includes('cv-maken') || p.includes('voor-kandidaten')) return 'kandidaat';
    return 'all';
  }
  function detectDevice(){
    const w = window.innerWidth;
    if (w < 640) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }
  function freqCapHit(triggerType){
    const k = 'hr_conv_freq_' + triggerType;
    const last = parseInt(localStorage.getItem(k) || '0', 10);
    return (Date.now() - last) < FREQ_CAP_HOURS * 60 * 60 * 1000;
  }
  function setFreqCap(triggerType){
    localStorage.setItem('hr_conv_freq_' + triggerType, String(Date.now()));
  }

  // ============ n8n Webhook API ============
  async function webhook(action, payload){
    try {
      const r = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
      });
      if (!r.ok) return null;
      return await r.json();
    } catch(e){ return null; }
  }

  // ============ State ============
  const state = {
    token: getSessionToken(),
    sector: detectSector(),
    side: detectSide(),
    device: detectDevice(),
    page: location.pathname,
    sessionStarted: false,
    triggered: { exit_intent: false, scroll_50: false, scroll_75: false, time_30: false, time_45: false },
    startTime: Date.now()
  };

  // ============ Session start ============
  async function startSession(){
    if (state.sessionStarted) return;
    state.sessionStarted = true;
    await webhook('start_session', {
      session_token: state.token,
      landing_page: location.pathname,
      referrer: document.referrer || null,
      utm_source: getQS('utm_source'),
      utm_medium: getQS('utm_medium'),
      utm_campaign: getQS('utm_campaign'),
      user_agent: navigator.userAgent.substring(0, 200),
      device_type: state.device,
      sector: state.sector,
      side: state.side
    });
  }

  // ============ Event logging ============
  function logEvent(eventType, popupId, extra){
    webhook('log_event', {
      session_token: state.token,
      event_type: eventType,
      popup_id: popupId || null,
      page_url: location.pathname,
      event_data: extra || {}
    });
  }

  // ============ Popup render ============
  function renderModal(popup){
    if (document.getElementById('hr-conv-modal')) return;  // already shown
    const isMobile = state.device === 'mobile';
    const modal = document.createElement('div');
    modal.id = 'hr-conv-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'hr-conv-heading');
    // Mobile: bottom-sheet pattern (Baymard 2022 / Material Design Bottom Sheets)
    // Desktop: center modal (NN/g 2020)
    modal.innerHTML = `
      <style>
        #hr-conv-modal{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.55);display:flex;animation:hrconvFade .2s ease-out}
        @keyframes hrconvFade{from{opacity:0}to{opacity:1}}
        @keyframes hrconvSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes hrconvFadeIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        /* Desktop: center modal */
        #hr-conv-modal[data-mode="desktop"]{align-items:center;justify-content:center;padding:20px}
        #hr-conv-modal[data-mode="desktop"] .hr-conv-card{max-width:480px;width:100%;border-radius:20px;animation:hrconvFadeIn .25s ease-out}
        /* Mobile: bottom-sheet (Baymard/Material Design recommendation) */
        #hr-conv-modal[data-mode="mobile"]{align-items:flex-end;justify-content:center;padding:0}
        #hr-conv-modal[data-mode="mobile"] .hr-conv-card{width:100%;border-radius:24px 24px 0 0;animation:hrconvSlideUp .3s cubic-bezier(.32,.72,0,1);max-height:85vh;overflow-y:auto}
        #hr-conv-modal[data-mode="mobile"] .hr-conv-handle{width:36px;height:4px;background:#ddd;border-radius:2px;margin:8px auto 0}
        #hr-conv-modal .hr-conv-card{background:#fff;padding:32px 28px;font-family:'Inter',-apple-system,sans-serif;color:#003366;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.25)}
        #hr-conv-modal h2{font-family:'Poppins',sans-serif;font-weight:800;font-size:24px;line-height:1.25;margin:0 0 12px 0;color:#003366;letter-spacing:-.3px}
        #hr-conv-modal p{font-size:15px;line-height:1.5;margin:0 0 24px 0;color:#15183A;opacity:.85}
        #hr-conv-modal .hr-conv-actions{display:flex;flex-direction:column;gap:12px}
        /* WCAG 2.5.5: touch target ≥44px */
        #hr-conv-modal .hr-conv-btn{display:inline-block;text-align:center;padding:14px 20px;min-height:44px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;cursor:pointer;border:none;transition:transform .15s,box-shadow .15s;font-family:inherit;line-height:1.4}
        #hr-conv-modal .hr-conv-btn-primary{background:#3AB54A;color:#fff;box-shadow:0 4px 14px rgba(58,181,74,.3)}
        #hr-conv-modal .hr-conv-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(58,181,74,.4)}
        #hr-conv-modal .hr-conv-btn-secondary{background:transparent;color:#003366;border:1.5px solid #003366}
        #hr-conv-modal .hr-conv-close{position:absolute;top:14px;right:14px;background:transparent;border:none;font-size:24px;cursor:pointer;color:#999;width:44px;height:44px;border-radius:6px;line-height:1;display:flex;align-items:center;justify-content:center}
        #hr-conv-modal .hr-conv-close:hover{background:#f5f5f5;color:#003366}
        #hr-conv-modal .hr-conv-badge{display:inline-block;background:#E8F5EA;color:#3AB54A;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:1.5px;margin-bottom:14px;font-family:'Poppins',sans-serif}
        @media (max-width:640px){#hr-conv-modal h2{font-size:20px}}
      </style>
      <div data-mode="${isMobile ? 'mobile' : 'desktop'}" style="display:contents"></div>`.replace('data-mode="', 'data-mode-x="');
    modal.setAttribute('data-mode', isMobile ? 'mobile' : 'desktop');
    modal.innerHTML = `
      <style>
        #hr-conv-modal{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.55);display:flex;animation:hrconvFade .2s ease-out}
        @keyframes hrconvFade{from{opacity:0}to{opacity:1}}
        @keyframes hrconvSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes hrconvFadeIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        #hr-conv-modal[data-mode="desktop"]{align-items:center;justify-content:center;padding:20px}
        #hr-conv-modal[data-mode="desktop"] .hr-conv-card{max-width:480px;width:100%;border-radius:20px;animation:hrconvFadeIn .25s ease-out}
        #hr-conv-modal[data-mode="mobile"]{align-items:flex-end;justify-content:center;padding:0}
        #hr-conv-modal[data-mode="mobile"] .hr-conv-card{width:100%;border-radius:24px 24px 0 0;animation:hrconvSlideUp .3s cubic-bezier(.32,.72,0,1);max-height:85vh;overflow-y:auto}
        #hr-conv-modal[data-mode="mobile"] .hr-conv-handle{width:36px;height:4px;background:#ddd;border-radius:2px;margin:8px auto 4px}
        #hr-conv-modal .hr-conv-card{background:#fff;padding:32px 28px;font-family:'Inter',-apple-system,sans-serif;color:#003366;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.25)}
        #hr-conv-modal h2{font-family:'Poppins',sans-serif;font-weight:800;font-size:24px;line-height:1.25;margin:0 0 12px 0;color:#003366;letter-spacing:-.3px}
        #hr-conv-modal p{font-size:15px;line-height:1.5;margin:0 0 24px 0;color:#15183A;opacity:.85}
        #hr-conv-modal .hr-conv-actions{display:flex;flex-direction:column;gap:12px}
        #hr-conv-modal .hr-conv-btn{display:inline-block;text-align:center;padding:14px 20px;min-height:44px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;cursor:pointer;border:none;transition:transform .15s,box-shadow .15s;font-family:inherit;line-height:1.4}
        #hr-conv-modal .hr-conv-btn-primary{background:#3AB54A;color:#fff;box-shadow:0 4px 14px rgba(58,181,74,.3)}
        #hr-conv-modal .hr-conv-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(58,181,74,.4)}
        #hr-conv-modal .hr-conv-btn-secondary{background:transparent;color:#003366;border:1.5px solid #003366}
        #hr-conv-modal .hr-conv-close{position:absolute;top:14px;right:14px;background:transparent;border:none;font-size:24px;cursor:pointer;color:#999;width:44px;height:44px;border-radius:6px;line-height:1;display:flex;align-items:center;justify-content:center}
        #hr-conv-modal .hr-conv-close:hover{background:#f5f5f5;color:#003366}
        #hr-conv-modal .hr-conv-badge{display:inline-block;background:#E8F5EA;color:#3AB54A;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:1.5px;margin-bottom:14px;font-family:'Poppins',sans-serif}
        @media (max-width:640px){#hr-conv-modal h2{font-size:20px}}
      </style>
      <div class="hr-conv-card">
        ${isMobile ? '<div class="hr-conv-handle" aria-hidden="true"></div>' : ''}
        <button class="hr-conv-close" aria-label="Sluiten">&times;</button>
        <span class="hr-conv-badge">${popup.variant === 'A' ? 'AANBEVELING' : 'TIP'}</span>
        <h2 id="hr-conv-heading">${(popup.headline || '').replace(/</g,'&lt;')}</h2>
        ${popup.body_text ? `<p>${popup.body_text.replace(/</g,'&lt;')}</p>` : ''}
        <div class="hr-conv-actions">
          <a href="${popup.primary_cta_url}" class="hr-conv-btn hr-conv-btn-primary" data-cta="primary">${popup.primary_cta_text}</a>
          ${popup.secondary_cta_text && popup.secondary_cta_url ?
            `<a href="${popup.secondary_cta_url}" class="hr-conv-btn hr-conv-btn-secondary" data-cta="secondary">${popup.secondary_cta_text}</a>` : ''}
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    logEvent('popup_shown', popup.popup_id, { variant: popup.variant, method: popup.selection_method });

    const close = () => {
      logEvent('popup_dismissed', popup.popup_id, {});
      modal.remove();
    };

    modal.querySelector('.hr-conv-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    // NN/g 2020: ESC key support voor modal dismiss (accessibility)
    const escHandler = e => { if (e.key === 'Escape'){ close(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    modal.querySelectorAll('[data-cta]').forEach(btn => {
      btn.addEventListener('click', e => {
        logEvent('popup_clicked', popup.popup_id, { which: btn.dataset.cta });

        // Sanne handoff
        if (btn.getAttribute('href') === '#sanne-open' && popup.sanne_handoff_prompt) {
          e.preventDefault();
          if (window.sanneOpen && typeof window.sanneOpen === 'function') {
            window.sanneOpen(popup.sanne_handoff_prompt);
          } else {
            window.location.href = '/personeel-aanvragen.html#chat';
          }
          modal.remove();
        }
      });
    });
  }

  function renderStickyCTA(popup){
    if (document.getElementById('hr-sticky-cta')) return;
    const el = document.createElement('a');
    el.id = 'hr-sticky-cta';
    el.href = popup.primary_cta_url;
    el.innerHTML = `<span>${popup.primary_cta_text} →</span>`;
    el.setAttribute('data-popup-id', popup.popup_id);
    const style = document.createElement('style');
    style.textContent = `
      #hr-sticky-cta{position:fixed;bottom:16px;left:16px;right:16px;background:#3AB54A;color:#fff;padding:14px 20px;border-radius:12px;text-decoration:none;font-weight:700;font-family:'Inter',sans-serif;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.2);z-index:99997;font-size:15px;animation:hrSlideUp .3s ease-out}
      @keyframes hrSlideUp{from{transform:translateY(80px);opacity:0}to{transform:translateY(0);opacity:1}}
      @media(min-width:640px){#hr-sticky-cta{display:none}}
    `;
    document.head.appendChild(style);
    document.body.appendChild(el);
    logEvent('popup_shown', popup.popup_id, { variant: 'sticky' });
    el.addEventListener('click', () => logEvent('popup_clicked', popup.popup_id, { which: 'sticky' }));
  }

  // ============ Trigger pipeline ============
  async function triggerPopup(triggerType, triggerValue){
    if (state.triggered[triggerType] || freqCapHit(triggerType)) return;
    // NN/g 2017: geen popup binnen 10sec na pageload
    if (Date.now() - state.startTime < MIN_DELAY_MS) return;
    state.triggered[triggerType] = true;

    const result = await webhook('select_popup', {
      trigger_type: triggerType.replace(/_\d+$/, ''),  // 'scroll_50' → 'scroll_depth'
      sector: state.sector,
      side: state.side,
      page_url: state.page,
      device_type: state.device
    });

    if (!result || !result.ok || !result.popup_id) return;

    setFreqCap(triggerType);

    if (result.name && result.name.toLowerCase().includes('sticky')){
      renderStickyCTA(result);
    } else {
      renderModal(result);
    }
  }

  // ============ Detectors ============
  function attachExitIntent(){
    document.addEventListener('mouseleave', e => {
      if (e.clientY < 0 && state.side === 'werkgever' || state.side === 'kandidaat'){
        logEvent('exit_intent', null, {});
        triggerPopup('exit_intent');
      }
    });
  }

  function attachScrollDepth(){
    let maxPct = 0;
    window.addEventListener('scroll', () => {
      const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
      if (docH <= 0) return;
      const pct = Math.round((window.scrollY / docH) * 100);
      if (pct > maxPct){
        maxPct = pct;
        SCROLL_MILESTONES.forEach(m => {
          if (pct >= m && !state.triggered['scroll_'+m]){
            logEvent('scroll_milestone', null, { scroll_pct: m });
            triggerPopup('scroll_depth');
          }
        });
      }
    }, { passive: true });
  }

  function attachTimeOnPage(){
    TIME_MILESTONES_SEC.forEach(s => {
      setTimeout(() => {
        if (!state.triggered['time_'+s]){
          logEvent('scroll_milestone', null, { time_sec: s });
          triggerPopup('time_on_page');
        }
      }, s * 1000);
    });

    // Sanne proactief na 30 sec inactivity
    let lastActivity = Date.now();
    document.addEventListener('mousemove', () => lastActivity = Date.now(), { passive: true });
    setTimeout(() => {
      if (Date.now() - lastActivity > 25000){
        triggerPopup('sanne_proactive');
      }
    }, 30 * 1000);
  }

  function attachStickyCTA(){
    if (state.device !== 'mobile') return;
    // Toon sticky CTA op kandidaat-pagina's na 20% scroll
    let triggered = false;
    window.addEventListener('scroll', () => {
      if (triggered) return;
      const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
      const pct = (window.scrollY / docH) * 100;
      if (pct >= 20){
        triggered = true;
        triggerPopup('sticky_cta');
      }
    }, { passive: true });
  }

  // ============ Lead capture detection (forms) ============
  function attachLeadCapture(){
    document.addEventListener('submit', e => {
      const form = e.target;
      if (form.action && (form.action.includes('inschrijven') || form.action.includes('aanvraag') ||
                          form.action.includes('intake') || form.action.includes('avg'))){
        logEvent('lead_captured', null, { form_action: form.action });
      }
    }, true);
  }

  // ============ Boot ============
  async function boot(){
    await startSession();
    attachExitIntent();
    attachScrollDepth();
    attachTimeOnPage();
    attachStickyCTA();
    attachLeadCapture();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
