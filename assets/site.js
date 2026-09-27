/* Holland Recruitment — site.js */
(function () {
  document.documentElement.classList.add('js');

  /* ---------- reveal on scroll ---------- */
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }
  // Vangnet: niets mag onzichtbaar blijven als de observer niet vuurt.
  setTimeout(function () { els.forEach(function (el) { el.classList.add('in'); }); }, 2500);

  /* ---------- dropdowns ---------- */
  var toggles = document.querySelectorAll('[data-dropdown]');
  function closeAll(except) {
    toggles.forEach(function (t) {
      if (t === except) return;
      t.setAttribute('aria-expanded', 'false');
      var m = document.getElementById(t.getAttribute('aria-controls'));
      if (m) m.classList.remove('open');
    });
  }
  toggles.forEach(function (t) {
    var menu = document.getElementById(t.getAttribute('aria-controls'));
    t.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = t.getAttribute('aria-expanded') === 'true';
      closeAll(t);
      t.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (menu) menu.classList.toggle('open', !open);
    });
  });
  document.addEventListener('click', function () { closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  /* ---------- mobile menu ---------- */
  var burger = document.querySelector('.burger');
  var mm = document.getElementById('mobile-menu');
  if (burger && mm) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', open ? 'false' : 'true');
      mm.classList.toggle('open', !open);
    });
  }

  /* ---------- FAQ ---------- */
  document.querySelectorAll('.qa button').forEach(function (b) {
    b.addEventListener('click', function () {
      var qa = b.closest('.qa');
      var open = qa.classList.toggle('open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- herkomst (UTM / referrer) ---------- */
  function herkomst() {
    try {
      var p = new URLSearchParams(location.search);
      var src = p.get('utm_source');
      if (src) return src + (p.get('utm_campaign') ? ' / ' + p.get('utm_campaign') : '');
      if (document.referrer && document.referrer.indexOf(location.host) === -1) return new URL(document.referrer).host;
    } catch (e) {}
    return 'Direct';
  }

  /* ---------- forms ----------
     Elk formulier wordt verstuurd naar:
     1. Web3Forms  → e-mail met ALLE velden (opdrachtgevers → sales@, freelancers/contact → info@)
     2. Portaal-API → lead in database + admin_inbox (best effort)
     Succes zodra minstens één kanaal slaagt, zodat geen lead verloren gaat. */
  /* V7: één Web3Forms-formulier per doelgroep — het ontvangstadres hangt aan de sleutel.
     KEY_INFO  → info@holland-recruitment.nl  (freelancers + algemene contactvragen)
     KEY_SALES → sales@holland-recruitment.nl (opdrachtgevers). Leeg = valt terug op KEY_INFO. */
  var KEY_INFO = 'c41ed00f-f032-4e39-80cf-9bc3b43890ba';
  var KEY_SALES = '';
  function keyFor(team) { return (team === 'sales' && KEY_SALES) ? KEY_SALES : KEY_INFO; }
  var PORTAL = 'https://app.holland-recruitment.nl';
  var PORTAL_ENABLED = false;

  function collect(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) {
      if (k === 'botcheck') return;
      if (typeof v !== 'string') return;
      if (data[k] !== undefined) data[k] = [].concat(data[k], v);
      else data[k] = v;
    });
    return data;
  }
  function list(v) { return v === undefined ? [] : [].concat(v).filter(Boolean); }
  function txt(v) { return list(v).join(', '); }

  function sendWeb3(form, data, m) {
    var payload = { access_key: keyFor(m.team), subject: m.subject, from_name: m.fromName, replyto: data.email || '', herkomst: herkomst() };
    Object.keys(data).forEach(function (k) { payload[k] = Array.isArray(data[k]) ? data[k].join(', ') : data[k]; });
    var bc = form.querySelector('[name="botcheck"]');
    if (bc && bc.checked) payload.botcheck = true;
    return fetch('https://api.web3forms.com/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (j) { return !!(j && j.success); })
      .catch(function () { return false; });
  }

  function sendPortal(path, body) {
    return fetch(PORTAL + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) { return !!(j && j.ok); })
      .catch(function () { return false; });
  }

  var mappers = {
    assignment: function (d) {
      var description = [
        'Type professional: ' + txt(d.type_professional),
        'Expertise: ' + txt(d.expertise),
        'Opdracht: ' + (d.omschrijving || ''),
        'Start: ' + (d.startdatum || '-') + ' · Duur: ' + (d.duur || '-') + ' · Uren/week: ' + (d.uren_per_week || '-'),
        'Locatie: ' + (d.locatie || '-') + ' · Werkvorm: ' + txt(d.werkvorm),
        'Indicatief budget p/u: ' + (d.budget || '-'),
        'Aanvullend: ' + (d.aanvullend || '-')
      ].join('\n');
      var name = (d.contactpersoon || '').trim().split(' ');
      return {
        team: 'sales', fromName: 'Website — Opdrachtgever',
        subject: 'Opdracht-aanvraag: ' + (d.bedrijfsnaam || '') + ' — ' + txt(d.type_professional) + ' · ' + txt(d.expertise),
        path: '/api/website-signup-employer',
        body: {
          bedrijfsnaam: d.bedrijfsnaam, voornaam: name.shift() || '', achternaam: name.join(' '),
          email: d.email, telefoon: d.telefoon, plaats: d.locatie, branche: txt(d.expertise),
          functie_gevraagd: txt(d.type_professional), startdatum: d.startdatum,
          toelichting: description, avg_consent: true, source: 'website-professional-aanvragen', herkomst: herkomst()
        }
      };
    },
    freelancer: function (d) {
      var name = (d.naam || '').trim().split(' ');
      return {
        team: 'info', fromName: 'Website — Freelancer',
        subject: 'Freelancer-aanmelding: ' + (d.naam || '') + ' — ' + (d.titel || '') + ' · ' + txt(d.expertise),
        path: '/api/website-signup-candidate',
        body: {
          voornaam: name.shift() || '', achternaam: name.join(' '), email: d.email, telefoon: d.telefoon,
          woonplaats: d.woonplaats, functies: [d.titel].concat(list(d.expertise)).filter(Boolean),
          ervaring: d.ervaring, beschikbaarheid: d.beschikbaarheid, avg_consent: true,
          source: 'website-freelancer-aanmelden', herkomst: herkomst()
        }
      };
    },
    contact: function (d) {
      var sales = /^Opdrachtgever/.test(d.onderwerp || '');
      return { team: sales ? 'sales' : 'info', fromName: 'Website — Contact',
        subject: 'Contact' + (sales ? ' (opdrachtgever)' : '') + ': ' + (d.naam || '') + (d.organisatie ? ' — ' + d.organisatie : ''), path: null, body: null };
    }
  };

  document.querySelectorAll('form[data-hr-form]').forEach(function (form) {
    var kind = form.getAttribute('data-hr-form');
    var err = form.querySelector('.form-error');
    var success = document.getElementById(form.getAttribute('data-success'));
    var btn = form.querySelector('button[type="submit"]');
    var btnLabel = btn ? btn.innerHTML : '';

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (err) err.classList.remove('show');
      form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });

      // verplichte keuzegroepen (checkbox/radio)
      var groupOk = true;
      form.querySelectorAll('[data-required-group]').forEach(function (g) {
        if (!g.querySelector('input:checked')) { groupOk = false; g.setAttribute('aria-invalid', 'true'); }
      });
      if (!form.checkValidity() || !groupOk) {
        form.querySelectorAll(':invalid').forEach(function (el) { el.setAttribute('aria-invalid', 'true'); });
        if (err) { err.textContent = 'Controleer de gemarkeerde velden.'; err.classList.add('show'); }
        var first = form.querySelector(':invalid, [data-required-group][aria-invalid] input');
        if (first) first.focus();
        return;
      }

      var data = collect(form);
      var m = mappers[kind](data);
      if (btn) { btn.disabled = true; btn.textContent = 'Bezig met versturen…'; }

      var jobs = [sendWeb3(form, data, m)];
      // Portaal staat tijdelijk offline (besluit 26-09-2026). Zet PORTAL_ENABLED op true zodra het portaal weer live is.
      if (PORTAL_ENABLED && m.path) jobs.push(sendPortal(m.path, m.body));

      Promise.all(jobs).then(function (res) {
        var ok = res.some(Boolean);
        if (ok) {
          try { window.clarity && window.clarity('event', 'form-' + kind); } catch (e) {}
          try { window.gtag && window.gtag('event', 'generate_lead', { form: kind }); } catch (e) {}
          form.style.display = 'none';
          if (success) { success.classList.add('show'); success.setAttribute('tabindex', '-1'); success.focus(); }
        } else {
          if (btn) { btn.disabled = false; btn.innerHTML = btnLabel; }
          if (err) {
            err.innerHTML = 'Versturen is niet gelukt. Probeer het opnieuw of mail ons op <a href="mailto:info@holland-recruitment.nl">info@holland-recruitment.nl</a>.';
            err.classList.add('show');
          }
        }
      });
    });
  });
})();
