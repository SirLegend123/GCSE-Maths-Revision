"use strict";
// Sapphire's Maths: the app shell. It draws the screens, reads text aloud,
// saves progress and settings on this device, and runs rounds of questions.
// Each topic lives in its own file in topics/ and registers itself with
// App.topic({...}); see topics/exchange-rates.js for the shape.
//
// A question is a short scenario plus one or more small steps, so a big
// question is broken into single decisions:
//   { html, say,                        // the question, and the words read aloud
//     visual(r),                        // optional picture; r = {step, done}
//     steps: [
//       { type: "choice", ask, options: [{html}], answer, why },   // why: string or (picked) => string
//       { type: "number", ask, unit, check(value, info) },         // returns {ok, soft, msg}
//     ],
//     explain }                         // shown once the question is finished
// A wrong step is never a fail: the student tries again, and the question
// just counts as "with help" rather than "first time".
const App = (() => {
  const topics = [];
  const LS = {
    get(k, d){ try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };
  const settings = Object.assign({tint: "cream", theme: "auto", size: "l", spacing: false, sound: true, autoRead: false}, LS.get("sapphire-settings", {}));
  const progress = Object.assign({stars: {}, learned: {}}, LS.get("sapphire-progress", {}));
  const S = {view: "home", topic: null, round: null, slide: 0, help: false, confirmReset: false};

  /* ---------- small helpers ---------- */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const plain = html => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent.replace(/\s+/g, " ").trim(); };

  const I = {
    logo: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.5 6 .8-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.8z"/></svg>`,
    speak: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`,
    gear: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
    back: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`,
    check: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    bulb: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>`,
    card: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 10h10M7 14h6"/></svg>`,
    home: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>`,
    star: (fill, size = 24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="${fill}" stroke="var(--sun-deep)" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  };
  const starsHTML = (n, size = 18) => [0, 1, 2].map(i => I.star(i < n ? "var(--sun)" : "var(--surface-2)", size)).join("");
  const speakBtn = text => `<button class="iconbtn" data-act="speak" data-text="${esc(text)}" aria-label="Read aloud" title="Read aloud">${I.speak}</button>`;

  /* ---------- sound and speech ---------- */
  let actx = null;
  function chime(good){
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      (good ? [660, 880] : [392]).forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = "sine"; o.frequency.value = f;
        const t = actx.currentTime + i * 0.11;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.4);
      });
    } catch { /* no sound available */ }
  }
  function speak(text){
    try {
      const ss = window.speechSynthesis; if (!ss) { toast("Read aloud is not available here."); return; }
      ss.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB"; u.rate = 0.88;
      const v = ss.getVoices().find(v => /en-GB/i.test(v.lang)); if (v) u.voice = v;
      ss.speak(u);
    } catch { toast("Read aloud is not available here."); }
  }
  let toastTimer;
  function toast(msg){
    const r = document.getElementById("toastRoot");
    r.innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => r.innerHTML = "", 3200);
  }
  function confetti(){
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.createElement("canvas"); c.className = "confetti"; document.body.appendChild(c);
    const x = c.getContext("2d"); const W = c.width = innerWidth, H = c.height = innerHeight;
    const cs = getComputedStyle(document.documentElement);
    const cols = ["--sun", "--teal", "--good", "--warm", "--berry"].map(v => cs.getPropertyValue(v).trim());
    const P = Array.from({length: 110}, () => ({x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 11, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4, c: pick(cols), a: Math.random() * 6}));
    let t = 0;
    (function f(){
      x.clearRect(0, 0, W, H);
      for (const p of P){ p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }
      if (++t < 110) requestAnimationFrame(f); else c.remove();
    })();
  }

  /* ---------- settings and progress ---------- */
  function applySettings(){
    const r = document.documentElement;
    r.dataset.tint = settings.tint; r.dataset.size = settings.size; r.dataset.spacing = settings.spacing ? "wide" : "normal";
    if (settings.theme === "auto") delete r.dataset.theme; else r.dataset.theme = settings.theme;
  }
  const saveSettings = () => { LS.set("sapphire-settings", settings); applySettings(); };
  const saveProgress = () => LS.set("sapphire-progress", progress);
  const findTopic = id => topics.find(t => t.id === id);
  const keyOf = (t, a, lv) => `${t.id}/${a.id}/${lv || "-"}`;
  const levelsOf = a => a.levels && a.levels.length ? a.levels : [{id: null, name: "Play"}];
  function topicStars(t){
    let got = 0, max = 0;
    for (const a of t.activities) for (const lv of levelsOf(a)){ got += progress.stars[keyOf(t, a, lv.id)] || 0; max += 3; }
    return {got, max};
  }

  /* ---------- calculator ---------- */
  // The expression is kept as a string of digits, "." and the signs × ÷ + −.
  const OPS = "×÷+−";
  const pretty = s => s.replace(/([×÷+−])/g, " $1 ");
  function evaluate(s){
    const toks = s.match(/\d+\.\d*|\.\d+|\d+|[×÷+−]/g);
    if (!toks || toks.join("") !== s || toks.length % 2 === 0) return null;
    const nums = [], ops = [];
    for (let i = 0; i < toks.length; i++){
      const isOp = OPS.includes(toks[i]);
      if (isOp !== (i % 2 === 1)) return null;
      if (isOp) ops.push(toks[i]); else nums.push(Number(toks[i]));
    }
    const n = [nums[0]], o = [];
    ops.forEach((op, i) => {
      if (op === "×") n[n.length - 1] *= nums[i + 1];
      else if (op === "÷") n[n.length - 1] = nums[i + 1] === 0 ? NaN : n[n.length - 1] / nums[i + 1];
      else { o.push(op); n.push(nums[i + 1]); }
    });
    let v = n[0];
    o.forEach((op, i) => { v = op === "+" ? v + n[i + 1] : v - n[i + 1]; });
    return Number.isFinite(v) ? Number(v.toFixed(10)) : null;
  }
  function calcPress(k){
    const c = S.round.calc;
    if (c.fresh && /[\d.]/.test(k)) { c.expr = ""; c.ops = ""; }
    c.fresh = false;
    if (/\d/.test(k)) { if (c.expr.length < 18) c.expr += k; }
    else if (k === ".") { const last = c.expr.split(/[×÷+−]/).pop(); if (!last.includes(".")) c.expr += (last === "" ? "0." : "."); }
    else if (OPS.includes(k)) { if (!c.expr) return; if (OPS.includes(c.expr.slice(-1))) c.expr = c.expr.slice(0, -1); c.expr += k; }
    else if (k === "back") c.expr = c.expr.slice(0, -1);
    else if (k === "clear") { c.expr = ""; c.was = ""; c.ops = ""; }
    else if (k === "=") return calcEquals();
    return true;
  }
  function calcEquals(){
    const c = S.round.calc;
    if (!/[×÷+−]/.test(c.expr)) return true;
    const v = evaluate(c.expr);
    if (v === null) { toast("That sum is not finished yet."); return false; }
    c.was = pretty(c.expr) + " ="; c.ops += c.expr.replace(/[^×÷+−]/g, ""); c.expr = String(v); c.fresh = true;
    return true;
  }
  function calcHTML(step){
    const c = S.round.calc;
    const key = (k, label, cls = "", aria = label) => `<button class="key ${cls}" data-act="key" data-k="${k}" aria-label="${esc(aria)}">${label}</button>`;
    return `<div class="calc">
      <div class="screen" aria-live="polite"><div class="was">${esc(c.was)}</div><div class="now">${step.unit && !/[×÷+−]/.test(c.expr) ? `<span class="unit">${esc(step.unit)}</span>` : ""}${esc(pretty(c.expr)) || "0"}</div></div>
      <div class="keys">
        ${key("7", "7")}${key("8", "8")}${key("9", "9")}${key("÷", "÷<span>divide</span>", "op", "divide")}
        ${key("4", "4")}${key("5", "5")}${key("6", "6")}${key("×", "×<span>times</span>", "op", "times")}
        ${key("1", "1")}${key("2", "2")}${key("3", "3")}${key("−", "−<span>take</span>", "op", "take away")}
        ${key("0", "0")}${key(".", ".", "", "point")}${key("back", "⌫", "fn", "delete")}${key("+", "+<span>add</span>", "op", "add")}
        ${key("clear", "Clear", "fn")}${key("=", "=", "eq", "equals")}<button class="btn teal" style="grid-column:span 2; min-height:58px" data-act="checknum">Check ${I.check}</button>
      </div></div>`;
  }

  /* ---------- rounds ---------- */
  function startRound(topic, act, levelId){
    const qs = act.make(levelId);
    S.round = {topic, act, levelId, qs, i: 0, results: []};
    resetQuestion();
    S.view = "play"; render(); window.scrollTo(0, 0);
    readCurrent(true);
  }
  function resetQuestion(){
    const r = S.round;
    Object.assign(r, {step: 0, wrong: [], slips: 0, tries: 0, msg: "", msgKind: "", doneSteps: [], done: false, calc: {expr: "", was: "", ops: "", fresh: false}});
  }
  const currentQ = () => S.round.qs[S.round.i];
  const stepSay = st => st.say || plain(st.ask);
  function readCurrent(withQuestion){
    if (!settings.autoRead) return;
    const q = currentQ(), st = q.steps[S.round.step];
    speak((withQuestion ? q.say + ". " : "") + (st ? stepSay(st) : ""));
  }
  function stepDone(summary){
    const r = S.round, q = currentQ();
    r.doneSteps.push(summary); r.step++; r.wrong = []; r.tries = 0; r.msg = ""; r.msgKind = "";
    if (r.step >= q.steps.length){ r.done = true; r.results[r.i] = r.slips ? "help" : "done"; chime(true); }
    render();
    if (!r.done) readCurrent(false);
  }
  function slip(msg){
    const r = S.round; r.slips++; r.tries++; r.msg = msg; r.msgKind = "notyet"; chime(false); render();
  }
  function nextQuestion(){
    const r = S.round;
    if (r.i + 1 < r.qs.length){ r.i++; resetQuestion(); render(); window.scrollTo(0, 0); readCurrent(true); return; }
    const first = r.results.filter(x => x === "done").length, n = r.qs.length;
    r.stars = first / n >= 0.9 ? 3 : first / n >= 0.6 ? 2 : 1;
    r.first = first;
    const k = keyOf(r.topic, r.act, r.levelId);
    r.best = (progress.stars[k] || 0) < r.stars;
    progress.stars[k] = Math.max(progress.stars[k] || 0, r.stars); saveProgress();
    S.view = "done"; render(); window.scrollTo(0, 0);
    if (r.stars === 3) confetti();
  }

  /* ---------- views ---------- */
  function topBar(){
    const all = topics.reduce((n, t) => n + topicStars(t).got, 0);
    return `<header class="bar">
      <button class="brand" data-act="home" aria-label="Home"><span class="logo">${I.logo}</span><span>Sapphire's Maths</span></button>
      <span class="chip" title="Stars collected">${I.star("var(--sun)", 18)}<span>${all} star${all === 1 ? "" : "s"}</span></span>
      <button class="iconbtn" data-act="settings" aria-label="Settings" title="Settings">${I.gear}</button>
    </header>`;
  }
  function homeView(){
    return `${topBar()}
    <div class="hello"><span class="eyebrow">Hello Sapphire</span><h1>What shall we practise?</h1>
      <p class="muted">Take your time. There are no timers, and you can try again as many times as you like.</p></div>
    <div class="grid">
      ${topics.map(t => { const s = topicStars(t); return `<button class="tcard" data-act="topic" data-id="${t.id}">
        <span class="ti" aria-hidden="true">${t.icon}</span>
        <span class="info"><b>${esc(t.title)}</b><span class="small muted">${esc(t.blurb)}</span>
        <span class="small">${I.star("var(--sun)", 16)} ${s.got} of ${s.max} stars</span></span></button>`; }).join("")}
      <div class="tcard soon"><span class="info"><b>More topics soon</b><span class="small">New topics will appear here.</span></span></div>
    </div>`;
  }
  function topicView(){
    const t = S.topic;
    return `${topBar()}<button class="back" data-act="home">${I.back} All topics</button>
    <div class="hello"><span class="eyebrow">Topic</span><h1>${esc(t.title)}</h1><p>${esc(t.blurb)}</p></div>
    <div class="learnbox">
      <div class="panel"><h2>Learn it</h2><p class="muted">${t.learn.length} short pages, with pictures. Each page can be read aloud.</p>
        <button class="btn teal" data-act="learn">${progress.learned[t.id] ? I.check + " Look again" : "Start here"}</button></div>
      <div class="panel"><h2>Help card</h2><p class="muted">The rule on one card. You can open it during any question.</p>
        <button class="btn ghost" data-act="help">${I.card} Open the help card</button></div>
    </div>
    <h2>Practise</h2>
    <div class="acts">${t.activities.map((a, i) => `<div class="act">
      <div class="top"><span class="n">${i + 1}</span><div><b>${esc(a.title)}</b><span class="small muted">${esc(a.blurb)}</span></div></div>
      <div class="levels">${levelsOf(a).map(lv => `<button class="lvl" data-act="start" data-a="${i}" data-lv="${lv.id ?? ""}">
        <span>${esc(lv.name)}${lv.blurb ? `<span class="small muted" style="display:block;font-weight:500">${esc(lv.blurb)}</span>` : ""}</span>
        <span class="st" aria-label="${progress.stars[keyOf(t, a, lv.id)] || 0} of 3 stars">${starsHTML(progress.stars[keyOf(t, a, lv.id)] || 0)}</span></button>`).join("")}</div>
    </div>`).join("")}</div>`;
  }
  function learnView(){
    const t = S.topic, sl = t.learn[S.slide], last = S.slide === t.learn.length - 1;
    return `${topBar()}<button class="back" data-act="topic" data-id="${t.id}">${I.back} ${esc(t.title)}</button>
    <div class="big-card slide">
      <div class="qhead"><div><span class="eyebrow">Page ${S.slide + 1} of ${t.learn.length}</span><h2>${esc(sl.title)}</h2></div>${speakBtn(sl.say)}</div>
      <div class="vis">${sl.html}</div>
    </div>
    <div class="sdots" aria-hidden="true">${t.learn.map((_, i) => `<i class="${i === S.slide ? "now" : ""}"></i>`).join("")}</div>
    <div class="row" style="justify-content:space-between">
      <button class="btn ghost" data-act="slide" data-d="-1" ${S.slide === 0 ? "disabled" : ""}>${I.back} Back</button>
      ${last ? `<button class="btn" data-act="learned">Start practising</button>` : `<button class="btn" data-act="slide" data-d="1">Next page</button>`}
    </div>`;
  }
  function playView(){
    const r = S.round, q = currentQ(), st = q.steps[r.step];
    const lvName = r.levelId ? levelsOf(r.act).find(l => l.id === r.levelId).name : "";
    const dots = r.qs.map((_, i) => `<i class="${r.results[i] || ""} ${i === r.i ? "now" : ""}"></i>`).join("");
    let body = "";
    if (r.doneSteps.length) body += `<ul class="donesteps">${r.doneSteps.map(d => `<li>${I.check}<span>${d}</span></li>`).join("")}</ul>`;
    if (!r.done){
      const n = q.steps.length > 1 ? `<span class="stepno">${r.step + 1}</span>` : "";
      body += `<div class="ask"><span style="display:flex;align-items:center">${n}<span>${st.ask}</span></span>${speakBtn(stepSay(st))}</div>`;
      if (st.type === "choice") body += `<div class="choices">${st.options.map((o, k) =>
        `<button class="choice ${r.wrong.includes(k) ? "wrong" : ""}" data-act="pick" data-k="${k}" ${r.wrong.includes(k) ? "disabled" : ""}>${o.html}</button>`).join("")}</div>`;
      else body += calcHTML(st);
      if (r.msg) body += `<div class="feedback ${r.msgKind}" role="status"><div class="head">${r.msgKind === "tip" ? I.bulb + " Nearly there" : I.bulb + " Not quite yet"}</div><div>${r.msg}</div></div>`;
    } else {
      const praise = r.slips ? "You got there!" : pick(["Brilliant!", "Spot on!", "Yes, that's it!", "Great thinking!"]);
      body += `<div class="feedback ok" role="status"><div class="head">${I.check} ${praise}</div>${q.explain ? `<div>${q.explain}</div>` : ""}</div>
        <button class="btn" data-act="next" id="nextBtn">${r.i + 1 < r.qs.length ? "Next question" : "See my stars"}</button>`;
    }
    return `${topBar()}
    <div class="playtop"><button class="back" data-act="stop">${I.back} Stop</button>
      <div class="dots" aria-label="Question ${r.i + 1} of ${r.qs.length}">${dots}</div>
      <button class="btn ghost sm" data-act="help">${I.card} Help card</button></div>
    <div class="big-card">
      <div class="qhead"><div><span class="eyebrow">${esc(r.act.title)}${lvName ? " · " + esc(lvName) : ""} · Question ${r.i + 1} of ${r.qs.length}</span><div class="qtext">${q.html}</div></div>${speakBtn(q.say)}</div>
      ${q.visual ? q.visual({step: r.step, done: r.done}) : ""}
      ${body}
    </div>`;
  }
  function doneView(){
    const r = S.round, n = r.qs.length, t = r.topic;
    const ai = t.activities.indexOf(r.act), next = t.activities[ai + 1];
    const msg = r.stars === 3 ? "Amazing. You really know this." : r.stars === 2 ? "Really good. A bit more practice and it will stick." : "Well done for finishing. Every go makes it easier.";
    return `${topBar()}
    <div class="panel finish">
      <div class="stars">${starsHTML(r.stars, 64)}</div>
      <h1>${r.first} of ${n} right first time</h1>
      <p>${msg}</p>
      ${r.best ? `<p class="small" style="font-weight:700">New best for this game!</p>` : ""}
      <div class="row" style="justify-content:center">
        <button class="btn" data-act="again">Play again</button>
        ${next ? `<button class="btn teal" data-act="start" data-a="${ai + 1}" data-lv="${levelsOf(next)[0].id ?? ""}">Next: ${esc(next.title)}</button>` : ""}
        <button class="btn ghost" data-act="topic" data-id="${t.id}">Back to ${esc(t.title)}</button>
      </div>
    </div>`;
  }
  function settingsView(){
    const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, l, sw]) => `<button data-act="set" data-k="${key}" data-v="${v}" aria-pressed="${String(settings[key]) === String(v)}">${sw ? `<span class="swatch" style="background:${sw}"></span>` : ""}${l}</button>`).join("")}</div>`;
    return `${topBar()}<button class="back" data-act="home">${I.back} Back</button>
    <div class="panel"><h1>Make it comfortable</h1><p class="muted">These settings stay on this device.</p>
      <h3>Background colour</h3>${seg("tint", [["cream", "Cream", "#FBF6E4"], ["sky", "Sky", "#E7F1F8"], ["mint", "Mint", "#E8F4EC"], ["rose", "Rose", "#F8EAEC"], ["white", "White", "#FFFFFF"]])}
      <h3>Light or dark</h3>${seg("theme", [["auto", "Match my device"], ["light", "Light"], ["dark", "Dark"]])}
      <h3>Text size</h3>${seg("size", [["m", "Medium"], ["l", "Large"], ["xl", "Extra large"]])}
      <h3>Letter spacing</h3>${seg("spacing", [["false", "Normal"], ["true", "Wider"]])}
      <h3>Read each question aloud by itself</h3>${seg("autoRead", [["false", "Off"], ["true", "On"]])}
      <p class="small muted">The speaker button reads any question or page aloud, whatever this is set to.</p>
      <h3>Sounds</h3>${seg("sound", [["true", "On"], ["false", "Off"]])}
    </div>
    <div class="panel"><h3>Start again</h3><p>This clears all the stars on this device.</p>
      ${S.confirmReset ? `<div class="row"><b>Are you sure?</b><button class="btn ghost sm" data-act="resetyes">Yes, clear my stars</button><button class="btn teal sm" data-act="resetno">No, keep them</button></div>`
        : `<div class="row"><button class="btn ghost sm" data-act="reset">Clear my stars</button></div>`}
    </div>`;
  }
  function helpHTML(){
    const t = S.topic || (S.round && S.round.topic);
    return `<div class="overlay" data-act="closehelp" data-backdrop="1"><div class="panel" role="dialog" aria-modal="true" aria-label="Help card">
      <div class="qhead"><div><span class="eyebrow">Help card</span><h2>${esc(t.help.title)}</h2></div>${speakBtn(t.help.say)}</div>
      ${t.help.html}
      <button class="btn teal" data-act="closehelp">Close the help card</button></div></div>`;
  }

  function render(){
    applySettings();
    const views = {home: homeView, topic: topicView, learn: learnView, play: playView, done: doneView, settings: settingsView};
    document.getElementById("app").innerHTML = (views[S.view] || homeView)();
    document.getElementById("overlayRoot").innerHTML = S.help ? helpHTML() : "";
  }
  const go = view => { S.view = view; S.help = false; render(); window.scrollTo(0, 0); };

  /* ---------- input ---------- */
  function checkNumber(){
    const r = S.round, st = currentQ().steps[r.step], c = r.calc;
    if (!calcEquals()) { render(); return; }
    if (!c.expr || c.expr === "." || /[×÷+−]$/.test(c.expr)) { r.msg = "Type your answer on the calculator first."; r.msgKind = "tip"; render(); return; }
    const v = Number(c.expr);
    const res = st.check(v, {tries: r.tries, ops: c.ops});
    if (res.ok) return stepDone(res.summary || `${esc(plain(st.ask))} <span class="m">${esc(st.unit || "")}${esc(c.expr)}</span>`);
    if (res.soft) { r.msg = res.msg; r.msgKind = "tip"; render(); return; }
    slip(res.msg);
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    if (b.dataset.backdrop && e.target !== b) return;
    const act = b.dataset.act, r = S.round;
    switch (act){
      case "home": S.confirmReset = false; go("home"); break;
      case "settings": go("settings"); break;
      case "topic": S.topic = findTopic(b.dataset.id); go("topic"); break;
      case "learn": S.slide = 0; go("learn"); if (settings.autoRead) speak(S.topic.learn[0].say); break;
      case "slide": S.slide = Math.max(0, Math.min(S.topic.learn.length - 1, S.slide + Number(b.dataset.d))); go("learn"); if (settings.autoRead) speak(S.topic.learn[S.slide].say); break;
      case "learned": progress.learned[S.topic.id] = true; saveProgress(); { const a = S.topic.activities[0]; startRound(S.topic, a, levelsOf(a)[0].id); } break;
      case "help": S.help = true; render(); document.querySelector(".overlay .panel button")?.focus(); break;
      case "closehelp": S.help = false; render(); break;
      case "speak": speak(b.dataset.text); break;
      case "set": { let v = b.dataset.v; if (v === "true") v = true; else if (v === "false") v = false; settings[b.dataset.k] = v; saveSettings(); render(); break; }
      case "reset": S.confirmReset = true; render(); break;
      case "resetno": S.confirmReset = false; render(); break;
      case "resetyes": progress.stars = {}; progress.learned = {}; saveProgress(); S.confirmReset = false; toast("Stars cleared."); render(); break;
      case "start": { const t = S.topic || r.topic, a = t.activities[Number(b.dataset.a)]; S.topic = t; startRound(t, a, b.dataset.lv || null); break; }
      case "again": startRound(r.topic, r.act, r.levelId); break;
      case "stop": S.topic = r.topic; go("topic"); break;
      case "pick": {
        const st = currentQ().steps[r.step], k = Number(b.dataset.k);
        if (r.done || r.wrong.includes(k)) break;
        if (k === st.answer) stepDone(st.doneText || st.options[k].html);
        else { r.wrong.push(k); slip(typeof st.why === "function" ? st.why(k) : st.why); }
        break; }
      case "key": if (calcPress(b.dataset.k)) render(); break;
      case "checknum": checkNumber(); break;
      case "next": nextQuestion(); break;
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && S.help) { S.help = false; render(); return; }
    if (S.view !== "play" || S.help || e.ctrlKey || e.metaKey || e.altKey) return;
    const r = S.round, st = currentQ().steps[r.step];
    if (r.done) { if (e.key === "Enter" && document.activeElement?.id !== "nextBtn") { e.preventDefault(); nextQuestion(); } return; }
    if (!st || st.type !== "number") return;
    const map = {"*": "×", "x": "×", "X": "×", "/": "÷", "-": "−", "+": "+", "Backspace": "back", "Delete": "clear", "=": "="};
    const k = /^[\d.]$/.test(e.key) ? e.key : map[e.key];
    if (e.key === "Enter") { e.preventDefault(); checkNumber(); return; }
    if (k) { e.preventDefault(); if (calcPress(k)) render(); }
  });

  return {
    topic(def){ topics.push(def); },
    start(){ applySettings(); render(); },
    util: {esc, rand, pick, shuffle, I},
  };
})();
