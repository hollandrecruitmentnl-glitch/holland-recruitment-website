/* Holland Recruitment — site.js */
(function () {
  document.documentElement.classList.add('js');

  /* ---------- reveal on scroll ---------- */
  var els = document.querySelectorAll('.reveal');
  // V8: wat bij laden al in beeld is direct tonen, zonder fade
  els.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in', 'now'); });
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

  /* ---------- V10: expertise vooraf aanvinken via ?expertise=<slug> ---------- */
  try {
    var pre = new URLSearchParams(location.search).get('expertise');
    if (pre) {
      var cb = document.querySelector('input[name="expertise"][data-slug="' + pre.replace(/[^a-z-]/g, '') + '"]');
      if (cb) cb.checked = true;
    }
  } catch (e) {}

  /* ---------- V13: reactie op een specifieke opdracht (?opdracht=<slug>) ---------- */
  try {
    var op = new URLSearchParams(location.search).get('opdracht');
    var ff = document.querySelector('form[data-hr-form="freelancer"]');
    if (op && ff) {
      var h = document.createElement('input'); h.type = 'hidden'; h.name = 'opdracht'; h.value = op.replace(/[^a-z0-9-]/g, '').slice(0, 80);
      ff.appendChild(h);
    }
  } catch (e) {}

  /* ---------- V10: mobiele actiebalk pas tonen na de hero ---------- */
  var sticky = document.querySelector('.m-sticky');
  if (sticky) {
    var onScroll = function () { sticky.classList.toggle('show', window.scrollY > 420); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------- FAQ ---------- */
  document.querySelectorAll('.qa button').forEach(function (b) {
    b.addEventListener('click', function () {
      var qa = b.closest('.qa');
      var open = qa.classList.toggle('open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- V17: profiel aanvullen via persoonlijke link ---------- */
  var pf = document.querySelector('form[data-hr-profile]');
  if (pf) {
    var q = new URLSearchParams(location.search), pid = q.get('id') || '', ptk = q.get('t') || '';
    var stat = document.getElementById('profiel-status'), hallo = document.getElementById('profiel-hallo');
    var showStatus = function (html) { stat.innerHTML = html; stat.style.display = 'block'; };
    fetch('/api/profiel?id=' + encodeURIComponent(pid) + '&t=' + encodeURIComponent(ptk))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) { showStatus('<b>Deze link werkt niet (meer).</b> Mail je gegevens naar <a href="mailto:info@holland-recruitment.nl" style="color:var(--blue);text-decoration:underline">info@holland-recruitment.nl</a>, dan voegen we ze toe.'); return; }
        if (!j.missing || !j.missing.length) { showStatus('<b>Je profiel is al compleet.</b> Bedankt! Past er een opdracht bij je, dan nemen we contact met je op.'); return; }
        if (j.voornaam) hallo.textContent = 'Hoi ' + j.voornaam + ', dit missen we nog:';
        pf.querySelectorAll('[data-need]').forEach(function (el) { el.style.display = j.missing.indexOf(el.getAttribute('data-need')) >= 0 ? '' : 'none'; });
        pf.hidden = false;
      })
      .catch(function () { showStatus('Er ging iets mis bij het laden. Probeer het later opnieuw of mail naar info@holland-recruitment.nl.'); });

    pf.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var perr = pf.querySelector('.form-error'); perr.classList.remove('show');
      if (!pf.checkValidity()) { perr.textContent = 'Controleer de gemarkeerde velden (KvK = 8 cijfers).'; perr.classList.add('show'); return; }
      var data = {}; new FormData(pf).forEach(function (v, k) { if (typeof v === 'string' && v.trim()) data[k] = v.trim(); });
      var f = pf.querySelector('input[name="cv"]'), file = f && f.files && f.files[0];
      if (file) {
        var ext = (file.name.split('.').pop() || '').toLowerCase();
        if (['pdf', 'doc', 'docx'].indexOf(ext) < 0 || file.size > 3 * 1024 * 1024) { perr.textContent = 'Upload je cv als PDF of Word, max. 3 MB.'; perr.classList.add('show'); return; }
      }
      var pbtn = pf.querySelector('button[type="submit"]'), plabel = pbtn.innerHTML; pbtn.disabled = true; pbtn.textContent = 'Bezig met opslaan…';
      var send = function (cv) {
        fetch('/api/profiel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pid, t: ptk, data: data, cv: cv }) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (!j.ok) throw new Error(j.error || 'fout');
            pf.style.display = 'none'; hallo.style.display = 'none';
            var ok = document.getElementById('profiel-ok');
            if (j.missing && j.missing.length) ok.querySelector('[data-done-text]').textContent = 'Opgeslagen. Wat nu nog ontbreekt, kun je later via dezelfde link aanvullen of in het gesprek met ons doorgeven.';
            ok.classList.add('show');
          })
          .catch(function () { pbtn.disabled = false; pbtn.innerHTML = plabel; perr.innerHTML = 'Opslaan is niet gelukt. Probeer het opnieuw of mail naar <a href="mailto:info@holland-recruitment.nl">info@holland-recruitment.nl</a>.'; perr.classList.add('show'); });
      };
      if (file) { var fr = new FileReader(); fr.onload = function () { send({ filename: file.name, data: String(fr.result).split(',')[1] || '' }); }; fr.readAsDataURL(file); }
      else send(null);
    });
  }

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
  var KEY_SALES = 'b99c0639-779f-4a15-bfe4-67307e9621e5';
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
        subject: (d.opdracht ? 'Reactie op opdracht ' + d.opdracht + ': ' : 'Freelancer-aanmelding: ') + (d.naam || '') + ' — ' + (d.titel || '') + ' · ' + txt(d.expertise),
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

      // V16: cv-bestand (freelancers) — controleren vóór verzenden
      var cvInput = form.querySelector('input[type="file"][name="cv"]');
      var cvFile = cvInput && cvInput.files && cvInput.files[0];
      if (cvFile) {
        var ext = (cvFile.name.split('.').pop() || '').toLowerCase();
        var cvErr = ['pdf', 'doc', 'docx'].indexOf(ext) < 0 ? 'Upload je cv als PDF of Word-bestand (.pdf, .doc of .docx).'
          : cvFile.size > 3 * 1024 * 1024 ? 'Je cv is groter dan 3 MB. Maak het bestand kleiner of stuur het later naar info@holland-recruitment.nl.' : '';
        if (cvErr) {
          cvInput.setAttribute('aria-invalid', 'true');
          if (err) { err.textContent = cvErr; err.classList.add('show'); }
          cvInput.focus();
          return;
        }
      }

      var data = collect(form);
      // V17: uniek ID per aanmelding (koppelt formulier, cv en aanvullingen in de Sheet)
      var leadId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('hr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));
      data.herkomst = herkomst();
      if (cvFile) data.cv_bestand = cvFile.name + ' (als bijlage in aparte mail "CV: …")';
      var m = mappers[kind](data);
      if (btn) { btn.disabled = true; btn.textContent = 'Bezig met versturen…'; }

      var jobs = [sendWeb3(form, data, m)];
      var cvJob = cvFile ? new Promise(function (resolve) {
        var fr = new FileReader();
        fr.onload = function () {
          var b64 = String(fr.result).split(',')[1] || '';
          fetch('/api/cv', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: leadId, filename: cvFile.name, data: b64, naam: data.naam, email: data.email, telefoon: data.telefoon, titel: data.titel, opdracht: data.opdracht || '' }) })
            .then(function (r) { return r.json(); }).then(function (j) { resolve(!!(j && j.ok)); }).catch(function () { resolve(false); });
        };
        fr.onerror = function () { resolve(false); };
        fr.readAsDataURL(cvFile);
      }) : Promise.resolve(null);
      // Portaal staat tijdelijk offline (besluit 26-09-2026). Zet PORTAL_ENABLED op true zodra het portaal weer live is.
      if (PORTAL_ENABLED && m.path) jobs.push(sendPortal(m.path, m.body));

      // V20: Sheet tegelijk met Web3Forms opslaan; lukt één van beide, dan is de aanmelding binnen
      var post = function (path, body) {
        return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          .then(function (r) { return r.json(); }).then(function (j) { return !!(j && j.ok); }).catch(function () { return false; });
      };
      var leadJob = post('/api/lead', { kind: kind, id: leadId, data: data });

      Promise.all([Promise.all(jobs), cvJob, leadJob]).then(function (all) {
        var res = all[0], cvOk = all[1], leadOk = all[2];
        var web3Ok = res.some(Boolean);
        // Web3Forms mislukt (spamfilter/storing/adblocker) → reserve-melding via eigen mailserver
        var fallback = web3Ok ? Promise.resolve(true) : post('/api/melding', { kind: kind, id: leadId, data: data });
        return fallback.then(function (mailOk) { return [web3Ok || leadOk || mailOk, cvOk]; });
      }).then(function (out) {
        var ok = out[0], cvOk = out[1];
        if (ok && cvOk === false && success) {
          var cn = document.createElement('p'); cn.className = 'mail-note';
          cn.innerHTML = 'Je gegevens zijn ontvangen, maar je cv kon niet worden meegestuurd. Mail het naar <a href="mailto:info@holland-recruitment.nl">info@holland-recruitment.nl</a>.';
          success.appendChild(cn);
        }
        if (ok) {
          try { window.clarity && window.clarity('event', 'form-' + kind); } catch (e) {}
          try { window.gtag && window.gtag('event', 'generate_lead', { form: kind }); } catch (e) {}
          form.style.display = 'none';
          if (success) { success.classList.add('show'); success.setAttribute('tabindex', '-1'); success.focus(); }
          // V11: bevestigingsmail in huisstijl naar de invuller (best effort, blokkeert niets)
          try {
            fetch('/api/bevestiging', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: kind, data: data }) })
              .then(function (r) { return r.json(); })
              .then(function (j) { var n = success && success.querySelector('.mail-note'); if (j && j.ok && n) n.hidden = false; })
              .catch(function () {});
          } catch (e) {}
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
