// Film-Player: alles wird aus einer Uhr abgeleitet (Zeit t in Sekunden).
// Bild, Bewegung, Einblendungen, Präsentationselemente und Untertitel sind reine Funktionen von t;
// der Ton wird zu den gemessenen Satzzeiten gestartet und bei Abweichung nachgeführt.
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const fachId = params.get('fach') || 'deutsch';
  const LOOP = params.get('loop') === '1';
  // ?kiosk=1 in kiosk.html: am Ende meldet der Film sich beim Rahmen, der den nächsten lädt
  const KIOSK = params.get('kiosk') === '1' && window.parent !== window;
  // in tafel.html oder kiosk.html: der Rahmen hält das Vollbild, der Film braucht keinen eigenen Knopf
  const FRAMED = window.parent !== window;
  const AUTOSTART = params.get('autostart') === '1';
  const HOME = 'index.html#' + encodeURIComponent(fachId);
  const FADE = 1.2;          // Überblendung zwischen Bildern
  const CHAPTER_FADE = 0.7;  // Ein- und Ausblenden der Kapitelkarte
  const SUB_HOLD = 0.35;     // Untertitel steht noch kurz nach dem Satzende
  const COUNT_UP = 0.9;      // Dauer des Hochzählens einer Zahl
  const RING_GROW = 1.3;     // Dauer, bis ein Ringsegment voll ist
  const IDLE_MS = 3000;      // Steuerleiste blendet sich aus
  const FIGURES = { sie: 'assets/img/figur_sie.jpg', er: 'assets/img/figur_er.jpg', c: 'assets/img/figur_c.jpg', d: 'assets/img/figur_d.jpg', e: 'assets/img/figur_e.jpg' };

  const film = (window.FILMS || {})[fachId];
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  if (!film) { document.body.textContent = 'Film „' + fachId + '“ nicht gefunden.'; return; }

  document.title = film.title;
  document.documentElement.style.setProperty('--accent', film.accent);

  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = (p) => 0.5 - Math.cos(Math.PI * p) / 2;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---- Zeitachse aufbereiten -------------------------------------------------------------
  const scenes = film.scenes;
  const total = film.total;
  const sentences = [];
  const shots = [];
  let chapterNo = 0;
  scenes.forEach((sc, i) => {
    sc.index = i;
    sc.chapStart = sc.start - sc.chapterDur;
    sc.end = sc.start + sc.duration;
    if (sc.chapter) sc.chapterNo = ++chapterNo;
    sc.sentences.forEach((s) => sentences.push({ ...s, abs: sc.start + s.start, scene: sc }));
    const list = [{ ...sc.image, t: 0 }].concat(sc.imageCues || []);
    list.forEach((im, k) => {
      const from = sc.start + im.t;
      const to = k < list.length - 1 ? sc.start + list[k + 1].t : sc.end;
      shots.push({ ...im, from, to, scene: sc });
    });
  });

  // ---- Bilder mit Bewegung -----------------------------------------------------------------
  const MOTION = {
    'zoom-in':   { s: [1.0, 1.16], x: [0, 0],   y: [0, 0] },
    'zoom-out':  { s: [1.16, 1.0], x: [0, 0],   y: [0, 0] },
    'pan-right': { s: [1.14, 1.14], x: [4, -4], y: [0, 0] },
    'pan-left':  { s: [1.14, 1.14], x: [-4, 4], y: [0, 0] },
    'pan-up':    { s: [1.14, 1.14], x: [0, 0],  y: [-5, 5] },
    'pan-down':  { s: [1.14, 1.14], x: [0, 0],  y: [5, -5] },
    'still':     { s: [1.0, 1.06], x: [0, 0],   y: [0, 0] }
  };
  const layers = [$('shotA'), $('shotB')].map((node) => ({
    node, bg: node.querySelector('.bg'), frame: node.querySelector('.frame'), img: node.querySelector('img'), shot: null
  }));

  function paintShot(layer, shot, t, opacity) {
    if (layer.shot !== shot) {
      layer.shot = shot;
      layer.img.src = shot.src;
      layer.node.classList.toggle('card', shot.fit === 'card');
      layer.node.classList.toggle('contain', shot.fit === 'contain');
      const bg = shot.fit === 'card' || shot.fit === 'contain' ? (shot.bg || shot.src) : '';
      layer.bg.style.backgroundImage = bg ? 'url("' + bg + '")' : '';
      layer.frame.style.transformOrigin = shot.fit !== 'card' && shot.focus ? (shot.focus[0] * 100) + '% ' + (shot.focus[1] * 100) + '%' : '50% 50%';
      layer.img.style.objectPosition = '';
      layer.img.style.filter = shot.dim ? 'brightness(' + (1 - shot.dim) + ')' : '';
    }
    const m = MOTION[shot.motion] || MOTION['zoom-in'];
    const p = ease(clamp01((t - shot.from) / (shot.to - shot.from + FADE)));
    const s = lerp(m.s[0], m.s[1], p);
    if (shot.fit === 'card') {
      layer.frame.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
    } else {
      layer.frame.style.transform = 'translate(' + lerp(m.x[0], m.x[1], p) + '%,' + lerp(m.y[0], m.y[1], p) + '%) scale(' + s + ')';
    }
    // "pos": Ausschnitt eines Hochformats wandert, z. B. [[0.5, 1], [0.5, 0]] = von unten nach oben
    if (shot.pos) layer.img.style.objectPosition = lerp(shot.pos[0][0], shot.pos[1][0], p) * 100 + '% ' + lerp(shot.pos[0][1], shot.pos[1][1], p) * 100 + '%';
    layer.node.style.opacity = opacity;
  }

  let currentShot = null;   // für die große Bildunterschrift neben Porträtkarten
  function renderImages(t, sc) {
    currentShot = null;
    if (t < sc.start) {
      // Kapitelkarte: das vorige Bild blendet aus
      const prev = shots.filter((s) => s.to <= sc.start).pop();
      layers.forEach((l) => { l.node.style.opacity = 0; });
      if (prev) paintShot(layers[shots.indexOf(prev) % 2], prev, t, clamp01(1 - (t - sc.chapStart) / CHAPTER_FADE));
      return;
    }
    let i = shots.findIndex((s) => t >= s.from && t < s.to);
    if (i < 0) i = shots.length - 1;
    const cur = shots[i], prev = shots[i - 1];
    const fadeIn = clamp01((t - cur.from) / FADE);
    const afterChapter = cur.from === cur.scene.start && cur.scene.chapterDur > 0;
    const curLayer = layers[i % 2], otherLayer = layers[(i + 1) % 2];
    // Unter dem neuen Bild liegt das vorige (Überblendung) – nach einer Kapitelkarte kommt es aus dem Schwarz
    if (prev && fadeIn < 1 && !afterChapter) paintShot(otherLayer, prev, t, 1);
    else otherLayer.node.style.opacity = 0;
    curLayer.node.style.zIndex = 2; otherLayer.node.style.zIndex = 1;
    paintShot(curLayer, cur, t, fadeIn);
    currentShot = cur;
  }

  // ---- Präsentationselemente ----------------------------------------------------------------
  // Jedes Element wird beim Szenenwechsel einmal gebaut; je Bild nur Klassen und Werte gesetzt.
  let built = null;   // { reveals: [{node, t}], counters: [...], ring: {...}, stations: [...] }

  function buildPanel(p, b) {
    const card = el('div', 'card');
    b.card = { node: card, t: Infinity };
    const at = (x) => (x && x.t != null ? x.t : p.t != null ? p.t : 0);
    const reveal = (node, t) => { node.classList.add('reveal'); b.reveals.push({ node, t }); b.card.t = Math.min(b.card.t, t); return node; };
    if (p.title) card.appendChild(el('p', 'p-title', p.title));

    if (p.type === 'stats') {
      p.items.forEach((it) => {
        const row = el('div', 'stat');
        const num = el('div', 'num');
        const target = /^\d+$/.test(it.value) ? Number(it.value) : null;
        if (it.prefix) num.appendChild(el('small', '', it.prefix));
        const val = el('span', '', it.value);
        num.appendChild(val);
        const lbl = el('div', 'lbl', it.label);
        if (it.sub) lbl.appendChild(el('em', '', it.sub));
        row.appendChild(num); row.appendChild(lbl);
        card.appendChild(reveal(row, at(it)));
        if (target !== null) b.counters.push({ node: val, t: at(it), target });
      });
    } else if (p.type === 'combo') {
      p.items.forEach((it) => {
        const row = el('div', 'combo ' + (it.ok ? 'ok' : 'no'));
        if (it.figure && FIGURES[it.figure]) { const im = el('img', 'av'); im.src = FIGURES[it.figure]; im.alt = ''; row.appendChild(im); }
        else row.appendChild(el('span', 'av none', '?'));
        row.appendChild(el('span', 'pair', it.a + ' + ' + it.b));
        const badge = el('span', 'badge', it.ok ? '✓' : '✗');
        badge.setAttribute('aria-label', it.ok ? 'möglich' : 'nicht möglich');
        row.appendChild(badge);
        card.appendChild(reveal(row, at(it)));
      });
    } else if (p.type === 'list') {
      p.items.forEach((it, k) => {
        const row = el('div', 'li');
        row.appendChild(el('span', 'dot', p.check ? '✓' : String(k + 1)));
        row.appendChild(el('span', '', it.text));
        card.appendChild(reveal(row, at(it)));
      });
    } else if (p.type === 'compare') {
      const grid = el('div', 'cmp');
      const t0 = Math.min.apply(null, p.items.map(at));
      [el('div', 'h', ''), el('div', 'h', p.head[0]), el('div', 'h lk', p.head[1])].forEach((c) => grid.appendChild(reveal(c, t0)));
      p.items.forEach((it) => {
        [el('div', 'rl', it.label), el('div', '', it.a), el('div', 'lk', it.b)].forEach((c) => grid.appendChild(reveal(c, at(it))));
      });
      card.appendChild(grid);
    } else if (p.type === 'ring') {
      const wrap = el('div', 'ring-wrap');
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      const R = 40, C = 2 * Math.PI * R;
      const track = document.createElementNS(NS, 'circle');
      track.setAttribute('class', 'track'); track.setAttribute('cx', 50); track.setAttribute('cy', 50); track.setAttribute('r', R);
      svg.appendChild(track);
      const colors = ['var(--accent)', '#7f93a6', '#b7a36a'];
      const legend = el('div', 'ring-legend');
      let offset = 0;
      b.ring = { C, segs: [] };
      p.parts.forEach((part, k) => {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('class', 'seg'); c.setAttribute('cx', 50); c.setAttribute('cy', 50); c.setAttribute('r', R);
        c.style.stroke = colors[k % colors.length];
        c.style.strokeDashoffset = String(-offset);
        c.style.strokeDasharray = '0 ' + C;
        svg.appendChild(c);
        b.ring.segs.push({ node: c, len: C * part.value / 100, t: at(part) });
        offset += C * part.value / 100;
        const lg = el('div', 'lg');
        const v = el('b', '', part.value + ' %'); v.style.color = colors[k % colors.length];
        lg.appendChild(v); lg.appendChild(el('span', '', part.label));
        legend.appendChild(reveal(lg, at(part)));
      });
      b.card.t = Math.min(b.card.t, at(p.parts[0]));
      wrap.appendChild(svg); wrap.appendChild(legend);
      card.appendChild(wrap);
    }
    if (p.notes) {
      const notes = el('div', 'notes');
      p.notes.forEach((n) => notes.appendChild(reveal(el('div', 'note', n.text), at(n))));
      card.appendChild(notes);
    }
    return card;
  }

  function buildBand(bd, b) {
    const tl = el('div', 'tl');
    bd.items.forEach((it) => {
      const st = el('div', 'st');
      st.dataset.q = it.label;
      st.appendChild(el('div', 'stx', it.text));
      tl.appendChild(st);
      b.stations.push({ node: st, t: it.t || 0 });
    });
    b.bandT = Math.min.apply(null, bd.items.map((x) => x.t || 0)) - 0.6;
    return tl;
  }

  const ui = {
    chapter: $('chapter'), chapNum: document.querySelector('.chap-num'), chapKicker: document.querySelector('.chap-kicker'),
    chapTitle: document.querySelector('.chap-title'), title: $('title'), corner: $('corner'), logo: $('logo'),
    caption: $('caption'), panel: $('panel'), band: $('band'), takeaways: $('takeaways'), endcard: $('endcard'), subs: $('subs')
  };
  let shownScene = null, shownCaption = null, shownSub = null;

  function setupScene(sc) {
    shownScene = sc; shownCaption = null;
    ui.chapNum.textContent = sc.chapter ? String(sc.chapterNo).padStart(2, '0') : '';
    ui.chapKicker.textContent = sc.chapter ? 'Kapitel ' + sc.chapterNo : '';
    ui.chapTitle.textContent = sc.chapter || '';
    ui.title.querySelector('h1').textContent = sc.title ? sc.title.main : '';
    ui.title.querySelector('p').textContent = sc.title ? sc.title.sub : '';
    ui.corner.textContent = sc.corner || '';
    ui.caption.classList.remove('on');

    built = { reveals: [], counters: [], ring: null, stations: [], card: null, bandT: Infinity };
    ui.panel.innerHTML = ''; ui.band.innerHTML = ''; ui.takeaways.innerHTML = '';
    if (sc.panel) ui.panel.appendChild(buildPanel(sc.panel, built));
    if (sc.band) ui.band.appendChild(buildBand(sc.band, built));
    if (sc.takeaways) {
      const tk = el('div', 'tk');
      tk.appendChild(el('h3', '', sc.takeaways.title || 'Das Wichtigste'));
      sc.takeaways.items.forEach((txt, k) => { const r = el('div', 'tki'); r.appendChild(el('b', '', String(k + 1))); r.appendChild(el('span', '', txt)); tk.appendChild(r); });
      ui.takeaways.appendChild(tk);
    }

    ui.endcard.innerHTML = '';
    ui.endcard.classList.remove('on');
    if (sc.endCard) {
      sc.endCard.lines.forEach((line, k) => ui.endcard.appendChild(el('p', 'end-line' + (k > 0 ? ' small' : ''), line)));
      const c = el('div', 'credits');
      c.appendChild(el('h3', '', 'Bildnachweis'));
      // ohne content/<fach>_credits.json: nur eigene KI-Bilder
      (film.credits.length ? film.credits : ['Alle Bilder: KI-generiert (Google Gemini); dargestellte Personen sind erfunden.']).forEach((line) => c.appendChild(el('div', '', line)));
      ui.endcard.appendChild(c);
    }
    $('chapName').textContent = currentChapterName(sc);
  }

  function currentChapterName(sc) {
    for (let i = sc.index; i >= 0; i--) if (scenes[i].chapter) return 'Kapitel ' + scenes[i].chapterNo + ': ' + scenes[i].chapter;
    return film.title;
  }

  function renderOverlays(t, sc) {
    if (shownScene !== sc) setupScene(sc);
    const lt = t - sc.start;
    const live = lt < sc.duration - 0.4;                       // kurz vor Szenenende blendet alles aus
    const tkOn = !!sc.takeaways && lt >= sc.takeaways.t && live;

    // Kapitelkarte
    let chapOp = 0;
    if (sc.chapterDur && t < sc.start + CHAPTER_FADE) {
      const c = t - sc.chapStart;
      chapOp = c < CHAPTER_FADE ? c / CHAPTER_FADE : (t < sc.start ? 1 : 1 - (t - sc.start) / CHAPTER_FADE);
    }
    ui.chapter.style.opacity = clamp01(chapOp);
    ui.title.style.opacity = sc.title ? clamp01(Math.min((lt - 0.8) / 1.2, (sc.duration - 1.5 - lt) / 1.0)) : 0;
    ui.corner.classList.toggle('on', !!sc.corner && lt > 0.5 && live && !tkOn);
    ui.logo.classList.toggle('on', !!sc.logo && lt > 0.3 && live);

    // Bildunterschrift
    const cap = (sc.captions || []).find((c) => lt >= c.t && lt < c.end);
    const big = !!(currentShot && currentShot.fit === 'card');
    if (cap !== shownCaption) {
      shownCaption = cap;
      ui.caption.classList.remove('on');
      if (cap && cap.text) {   // leerer Text beendet die vorige Bildunterschrift
        // „Name · Werk“: neben einer Porträtkarte zweizeilig, Werk in der Leitfarbe
        const span = ui.caption.firstElementChild;
        const parts = cap.text.split(' · ');
        span.textContent = big ? parts[0] : cap.text;
        if (big && parts[1]) span.appendChild(el('b', '', parts.slice(1).join(' · ')));
        void ui.caption.offsetWidth; ui.caption.classList.add('on');
      }
    }
    ui.caption.classList.toggle('big', big);

    // Präsentationselemente
    const b = built;
    const showEls = live && !tkOn;
    if (b.card) b.card.node.classList.toggle('on', showEls && lt >= b.card.t - 0.3);
    b.reveals.forEach((r) => r.node.classList.toggle('on', showEls && lt >= r.t));
    b.counters.forEach((c) => {
      const p = clamp01((lt - c.t) / COUNT_UP);
      c.node.textContent = String(Math.round(c.target * ease(p)));
    });
    if (b.ring) b.ring.segs.forEach((s) => {
      const p = showEls ? ease(clamp01((lt - s.t) / RING_GROW)) : 0;
      s.node.style.strokeDasharray = (s.len * p) + ' ' + b.ring.C;
    });
    ui.band.style.opacity = showEls && lt >= b.bandT ? 1 : 0;
    b.stations.forEach((s) => s.node.classList.toggle('on', lt >= s.t));
    ui.takeaways.classList.toggle('on', tkOn);

    ui.endcard.classList.toggle('on', !!sc.endCard && lt > 0.6);
    // Untertitel
    const cue = sc.cues.find((c) => lt >= c.start && lt < c.end + SUB_HOLD);
    if (cue !== shownSub) {
      shownSub = cue;
      if (cue) ui.subs.firstElementChild.textContent = cue.text;
      ui.subs.classList.toggle('on', !!cue);
    }
  }

  // ---- Ton --------------------------------------------------------------------------------
  let muted = false;
  let audio = null, audioFor = null;
  const cache = new Map();
  function getAudio(src) {
    if (!cache.has(src)) { const a = new Audio(src); a.preload = 'auto'; a.muted = muted; cache.set(src, a); }
    return cache.get(src);
  }
  function stopAudio() { if (audio) audio.pause(); audio = null; audioFor = null; }
  // Die nächsten Aufnahmen schon laden, solange die aktuelle läuft
  const AHEAD = 5;
  function preloadFrom(i) { for (let k = i; k < Math.min(sentences.length, i + AHEAD); k++) getAudio(sentences[k].audio); }

  // Ist eine Aufnahme noch nicht abspielbereit, bleibt die Uhr stehen, statt ohne Ton
  // weiterzulaufen und dann den Satzanfang zu überspringen. Höchstens HOLD_MAX Sekunden,
  // damit eine fehlende Datei den Film nicht anhält.
  const HOLD_MAX = 4;
  let holdT = null, holdSince = 0, audioBlocked = false;

  // gibt die Zeit zurück, auf der die Uhr stehen bleiben soll, sonst null
  function renderAudio(t) {
    const s = sentences.find((x) => t >= x.abs && t < x.abs + x.dur);
    if (!s || !playing) { if (audio) stopAudio(); holdT = null; return null; }
    const want = t - s.abs;
    if (audioFor !== s) {
      stopAudio();
      audio = getAudio(s.audio); audioFor = s;
      audio.muted = muted;
      try { audio.currentTime = want > 0.25 ? want : 0; } catch (e) { /* noch nicht geladen */ }
      const p = audio.play();
      // Autoplay gesperrt (Seite ohne Klick geöffnet): Film läuft stumm weiter
      if (p && p.catch) p.catch((e) => { if (e && e.name === 'NotAllowedError') audioBlocked = true; });
      preloadFrom(sentences.indexOf(s) + 1);
    } else if (!audio.paused && Math.abs(audio.currentTime - want) > 0.35 && audio.readyState >= 3) {
      audio.currentTime = want;
    }
    if (!audioBlocked && audio.readyState < 3) {
      if (holdT === null) { holdT = t; holdSince = now(); }
      if (now() - holdSince < HOLD_MAX) return holdT;
    }
    holdT = null;
    return null;
  }
  // nach einem Klick darf der Ton wieder starten
  document.addEventListener('pointerdown', () => { if (audioBlocked) { audioBlocked = false; stopAudio(); } });

  function setMuted(m) {
    muted = m;
    cache.forEach((a) => { a.muted = m; });
    const b = $('mute');
    b.setAttribute('aria-pressed', String(m));
    b.querySelector('.lbl').textContent = m ? 'Ton an' : 'Ton aus';
    b.title = m ? 'Ton einschalten (M)' : 'Ton ausschalten (M)';
  }

  // ---- Uhr ----------------------------------------------------------------------------------
  let playing = false, base = 0, startedAt = 0;
  const now = () => performance.now() / 1000;
  function time() { return playing ? base + (now() - startedAt) : base; }
  // Ende des Films: nach kurzem Countdown automatisch zurück zur Übersicht
  // (im Kiosk-Modus ?loop=1 beginnt der Film stattdessen von vorn)
  const RETURN_AFTER = 8;
  let finishTimer = null;
  function showFinish() {
    $('finish').hidden = false;
    let left = RETURN_AFTER;
    const hint = $('finishHint');
    const tick = () => { hint.textContent = 'Weiter zur Übersicht in ' + left + ' Sekunde' + (left === 1 ? '' : 'n') + ' …'; };
    tick();
    clearInterval(finishTimer);
    finishTimer = setInterval(() => {
      left--;
      if (left <= 0) { clearInterval(finishTimer); location.href = HOME; } else tick();
    }, 1000);
  }
  function cancelFinish() { clearInterval(finishTimer); finishTimer = null; $('finishHint').textContent = ''; }

  function play() {
    cancelFinish();
    if (playing) return;
    if (base >= total) base = 0;
    playing = true; startedAt = now();
    stage.classList.remove('paused');
    $('playBtn').setAttribute('aria-label', 'Pause');
    $('finish').hidden = true;
  }
  function pause() {
    if (!playing) return;
    base = time(); playing = false;
    stopAudio();
    stage.classList.add('paused');
    $('playBtn').setAttribute('aria-label', 'Abspielen');
  }
  function seek(t) {
    cancelFinish();
    $('finish').hidden = true;
    base = Math.max(0, Math.min(total - 0.01, t));
    if (playing) startedAt = now();
    stopAudio(); holdT = null;
    shownSub = null; shownCaption = null;
  }
  function sceneAt(t) {
    for (let i = scenes.length - 1; i >= 0; i--) if (t >= scenes[i].chapStart) return scenes[i];
    return scenes[0];
  }
  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  function frame() {
    let t = time();
    if (t >= total) {
      if (KIOSK) { if (playing) { base = total; playing = false; stopAudio(); window.parent.postMessage({ type: 'tdot-film-ended', fach: fachId }, '*'); } t = total; }
      else if (LOOP) { seek(0); t = 0; }
      else if (playing) { base = total; playing = false; stopAudio(); stage.classList.add('paused'); showFinish(); t = total; }
    }
    const tt = Math.min(t, total - 0.001);
    const sc = sceneAt(tt);
    renderImages(tt, sc);
    if (playing) preloadImagesAfter(tt);
    renderOverlays(tt, sc);
    const hold = renderAudio(tt);
    if (hold !== null && playing) { base = hold; startedAt = now(); }
    $('progress-fill').style.width = (100 * tt / total) + '%';
    $('topbar-fill').style.transform = 'scaleX(' + (tt / total) + ')';
    $('time').textContent = fmt(tt) + ' / ' + fmt(total);
    requestAnimationFrame(frame);
  }

  // ---- Bedienung ------------------------------------------------------------------------------
  function prevScene() {
    const t = time(); const sc = sceneAt(t);
    const target = (t - sc.chapStart > 3 || sc.index === 0) ? sc : scenes[sc.index - 1];
    seek(target.chapStart);
  }
  function nextScene() {
    const sc = sceneAt(time());
    if (sc.index < scenes.length - 1) seek(scenes[sc.index + 1].chapStart);
  }
  function setSubs(on) {
    stage.classList.toggle('no-subs', !on);
    const b = $('subsBtn'); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Untertitel an' : 'Untertitel aus';
  }

  $('playBtn').addEventListener('click', () => (playing ? pause() : play()));
  $('prevBtn').addEventListener('click', prevScene);
  $('nextBtn').addEventListener('click', nextScene);
  $('mute').addEventListener('click', () => setMuted(!muted));
  $('subsBtn').addEventListener('click', () => setSubs(stage.classList.contains('no-subs')));
  $('fsBtn').addEventListener('click', () => {
    if (FRAMED) return;
    if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen();
  });
  $('againBtn').addEventListener('click', () => { seek(0); play(); });
  const prog = $('progress');
  prog.addEventListener('click', (e) => { const r = prog.getBoundingClientRect(); seek(total * (e.clientX - r.left) / r.width); });
  prog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { seek(time() + 5); e.preventDefault(); e.stopPropagation(); }
    if (e.key === 'ArrowLeft') { seek(time() - 5); e.preventDefault(); e.stopPropagation(); }
  });
  scenes.forEach((sc) => {
    if (!sc.chapter) return;
    const i = document.createElement('i'); i.style.left = (100 * sc.chapStart / total) + '%'; i.title = sc.chapter;
    $('progress-marks').appendChild(i);
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('#progress')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); if (!$('start').hidden) begin(); else (playing ? pause() : play()); }
    else if (k === 'arrowright') nextScene();
    else if (k === 'arrowleft') prevScene();
    else if (k === 'm') setMuted(!muted);
    else if (k === 'u') $('subsBtn').click();
    else if (k === 'f') $('fsBtn').click();
    wake();
  });

  let idleTimer = null;
  function wake() {
    stage.classList.add('ctl-visible');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (playing) stage.classList.remove('ctl-visible'); }, IDLE_MS);
  }
  ['mousemove', 'touchstart', 'click'].forEach((ev) => stage.addEventListener(ev, wake, { passive: true }));

  // ---- Vorladen -------------------------------------------------------------------------------
  // Beim Öffnen lädt der Player die erste Minute (Bilder und Ton). „Film starten“ wartet darauf und
  // zeigt den Fortschritt – bei langsamem Netz wartet man einmal am Anfang statt mittendrin.
  const WARM = 60;          // so viele Sekunden Film sollen vor dem Start geladen sein
  const WARM_MAX = 20;      // danach bietet der Knopf „Trotzdem starten“ an
  const SHOW_AFTER = 400;   // ms: lädt es schneller, erscheint gar keine Anzeige
  const imgCache = new Map();
  function loadImage(src) {
    if (!imgCache.has(src)) imgCache.set(src, new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = src; }));
    return imgCache.get(src);
  }
  function audioReady(a) {
    return new Promise((res) => {
      if (a.readyState >= 3) { res(); return; }
      ['canplay', 'canplaythrough', 'error'].forEach((ev) => a.addEventListener(ev, () => res(), { once: true }));
    });
  }
  let warmDone = false, warmP = 0;
  function warmUp(from) {
    const tEnd = from + WARM, jobs = [];
    shots.forEach((s) => { if (s.to > from && s.from < tEnd) { jobs.push(loadImage(s.src)); if (s.bg) jobs.push(loadImage(s.bg)); } });
    sentences.forEach((s) => { if (s.abs + s.dur > from && s.abs < tEnd) jobs.push(audioReady(getAudio(s.audio))); });
    let n = 0;
    jobs.forEach((p) => p.then(() => { n++; warmP = n / jobs.length; showLoad(); }));
    return Promise.all(jobs).then(() => { warmDone = true; showLoad(); });
  }
  function showLoad() {
    const box = $('loadInfo');
    if (warmDone) { box.hidden = true; return; }
    box.querySelector('i').style.width = Math.round(100 * warmP) + '%';
    box.querySelector('span').textContent = 'Film wird geladen … ' + Math.round(100 * warmP) + ' %';
  }
  // Bilder der nächsten Einstellungen schon laden, während der Film läuft
  let aheadFrom = -1;
  function preloadImagesAfter(t) {
    const i = shots.findIndex((s) => t < s.to);
    if (i === aheadFrom) return;
    aheadFrom = i;
    shots.slice(i, i + 5).forEach((s) => { loadImage(s.src); if (s.bg) loadImage(s.bg); });
  }

  let waiting = false;
  function begin() {
    if (!warmDone) {
      // erst starten, wenn die erste Minute da ist; nach WARM_MAX Sekunden geht es auch so
      if (waiting) { warmDone = true; } else {
        waiting = true;
        $('loadInfo').hidden = false;
        $('startBtn').disabled = true;
        $('startBtn').querySelector('span').textContent = 'Wird geladen …';
        setTimeout(() => {
          if (warmDone) return;
          $('startBtn').disabled = false;
          $('startBtn').querySelector('span').textContent = 'Trotzdem starten';
        }, WARM_MAX * 1000);
        warm.then(() => { if (waiting) begin(); });
        return;
      }
    }
    waiting = false;
    $('loadInfo').hidden = true;
    $('start').hidden = true;
    stage.classList.remove('at-start');
    play(); wake();
  }
  $('startBtn').addEventListener('click', begin);
  document.querySelector('.start-title').textContent = film.title;
  document.querySelector('.start-hint').textContent = fmt(total) + ' Minuten · mit Ton und Untertiteln';
  // Startbildschirm zeigt das erste Bild als Standbild statt Schwarz
  $('start').style.background = 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.2)), url("' + shots[0].src + '") center / cover no-repeat';
  // „Übersicht“ führt zurück in das Aufgabenfeld dieses Fachs (index.html#deutsch)
  document.querySelectorAll('a[href="index.html"]').forEach((a) => { a.href = HOME; });
  if (LOOP || KIOSK) $('homeBtn').hidden = true;
  if (FRAMED) $('fsBtn').hidden = true;

  setSubs(params.get('subs') !== '0');
  setMuted(params.get('muted') === '1');
  // ?t=… springt an eine Stelle und zeigt das Standbild ohne Startknopf (für Prüfwerkzeuge)
  if (params.has('t')) { base = Math.max(0, Math.min(total - 0.01, Number(params.get('t')) || 0)); $('start').hidden = true; }
  // ?static=1 schaltet Übergänge ab: Chrome headless friert CSS-Übergänge beim Bildschirmfoto ein
  if (params.get('static') === '1') stage.classList.add('static');
  stage.classList.add('paused');
  // die erste Minute lädt schon, während der Startbildschirm steht
  const warm = warmUp(base);
  setTimeout(() => { if (!warmDone && !$('start').hidden) { $('loadInfo').hidden = false; showLoad(); } }, SHOW_AFTER);
  if (!$('start').hidden) stage.classList.add('at-start');
  if (AUTOSTART) begin();
  requestAnimationFrame(frame);

  // Für Prüfwerkzeuge: Zustand von außen lesbar, ohne die Uhr zu beeinflussen
  window.__film = { time, total, scenes, seek, play, pause, isMuted: () => muted, finish: showFinish };
})();
