"use strict";
// Topic: exchange rates. The aim is to know, every time, whether to
// multiply or divide. One picture is used on every screen, the "money
// bridge": the pound is home; going away from £ is × the rate, coming back
// to £ is ÷ the rate. The sense check backs it up: £1 is worth more than 1
// euro, dollar or yen, so the other number is always bigger than the pounds.
(() => {
  const {esc, rand, pick, shuffle, I} = App.util;

  const GBP = {sym: "£", name: "pounds", one: "pound", small: "pence"};
  const EUR = {sym: "€", name: "euros", one: "euro", small: "cents", places: ["France", "Spain", "Italy"], friendly: 1.2, real: 1.15};
  const USD = {sym: "$", name: "dollars", one: "dollar", small: "cents", places: ["America", "New York", "Florida"], friendly: 1.5, real: 1.27};
  const JPY = {sym: "¥", name: "yen", one: "yen", small: null, places: ["Japan", "Tokyo"], friendly: 200, real: 190};
  const PEOPLE = [["Mia", "She"], ["Leo", "He"], ["Priya", "She"], ["Sam", "He"], ["Ava", "She"], ["Josh", "He"], ["Zara", "She"], ["Ben", "He"]];
  const ITEMS = ["T-shirt", "pizza", "theme park ticket", "pair of trainers", "hoodie", "phone case"];

  /* ---------- money: numbers, colours and words ---------- */
  const round2 = v => Math.round(v * 100 + 1e-9) / 100;
  const whole = cur => cur === JPY;
  const roundFor = (v, cur) => whole(cur) ? Math.round(v) : round2(v);
  const cls = cur => cur === GBP ? "gbp" : "fx";
  const cap = s => s[0].toUpperCase() + s.slice(1);
  // 57.5 -> "57.50", 23 -> "23", 1900 -> "1,900"
  function amount(v, cur){
    const r = round2(v);
    if (whole(cur) && Number.isInteger(r)) return r.toLocaleString("en-GB");
    return Number.isInteger(r) ? r.toLocaleString("en-GB") : r.toLocaleString("en-GB", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
  const rateNum = (cur, rate) => whole(cur) ? String(rate) : rate.toFixed(2);
  // A plain number for sums, as it would be typed into a calculator.
  const plainNum = v => String(Number(v.toFixed(2)));
  const m = (v, cur) => `<span class="m ${cls(cur)}">${cur.sym}${amount(v, cur)}</span>`;
  const coin = (cur, big) => `<span class="coin ${cls(cur)} ${big ? "big" : ""}" aria-hidden="true">${cur.sym}</span>`;
  // Words for read-aloud: €57.50 -> "57 euros and 50 cents"
  function sayMoney(v, cur){
    if (whole(cur)) return `${Math.round(v)} ${cur.name}`;
    const r = round2(v), units = Math.floor(r), small = Math.round((r - units) * 100);
    const u = units === 1 ? cur.one : cur.name;
    if (!small) return `${units} ${u}`;
    if (!units) return `${small} ${cur.small}`;
    return `${units} ${u} and ${small} ${cur.small}`;
  }
  const rateHTML = (cur, rate) => `<span class="rate">${coin(GBP)}${m(1, GBP)} = ${cur.sym === "¥" ? m(rate, cur) : `<span class="m fx">${cur.sym}${rateNum(cur, rate)}</span>`}${coin(cur)}</span>`;
  const rateSay = (cur, rate) => `1 pound equals ${sayMoney(rate, cur)}`;

  /* ---------- the money bridge ---------- */
  // on: "out" (away from £, ×) or "home" (back to £, ÷) lights up one way.
  // c: a case, to show its amounts; reveal shows the answer instead of "?".
  function bridge(cur, rate, {on = null, c = null, reveal = false} = {}){
    const r = rateNum(cur, rate);
    const gbpAmt = !c ? "" : c.out ? m(c.start, GBP) : reveal ? m(c.answer, GBP) : "?";
    const fxAmt = !c ? "" : c.out ? (reveal ? m(c.answer, cur) : "?") : m(c.start, cur);
    const way = w => on ? (on === w ? "on" : "off") : "";
    return `<div class="bridge" role="img" aria-label="The money bridge. Away from pounds: times ${r}. Back to pounds: divide by ${r}.">
      <div class="bank gbp">${coin(GBP, true)}<b>Pounds</b>${c ? `<span class="amt m gbp">${gbpAmt}</span>` : ""}<span class="homei">${I.home} home</span></div>
      <div class="ways">
        <div class="way ${way("out")}"><span class="opt">× ${r}</span><div class="arrow r"></div><small>away from £</small></div>
        <div class="way ${way("home")}"><span class="opt">÷ ${r}</span><div class="arrow l"></div><small>back to £</small></div>
      </div>
      <div class="bank fx">${coin(cur, true)}<b>${cap(cur.name)}</b>${c ? `<span class="amt m fx">${fxAmt}</span>` : ""}</div>
    </div>`;
  }
  const hook = text => `<div class="hook">${I.bulb}<span>${text}</span></div>`;
  const HOOK = "Away from £: times. Back to £: divide.";

  /* ---------- making questions ---------- */
  function poundsFor(cur, level){
    if (level === "friendly"){
      if (cur === EUR) return 5 * rand(2, 40);    // × 1.20 gives whole euros
      if (cur === USD) return 10 * rand(1, 20);   // × 1.50 gives whole dollars
      return 5 * rand(1, 20);
    }
    return pick([10, 20, 25, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200, 250, 300, 400]);
  }
  // One exchange: what you start with, what you get, and the answer you would
  // get by doing the wrong sum (multiplying instead of dividing, or the other way).
  // The wrong answer keeps its pennies, even in yen: ¥0.26 shows how silly it is.
  function makeCase(cur, out, level){
    const rate = level === "friendly" ? cur.friendly : cur.real;
    const pounds = poundsFor(cur, level);
    let start;
    if (out) start = pounds;
    else if (level === "friendly") start = pounds * rate;
    else start = whole(cur) ? 500 * rand(2, 40) : 5 * rand(3, 50);
    start = roundFor(start, out ? GBP : cur);
    const exact = out ? start * rate : start / rate;
    const to = out ? cur : GBP, from = out ? GBP : cur;
    const wrongExact = out ? start / rate : start * rate;
    return {cur, rate, out, from, to, start, exact, answer: roundFor(exact, to), wrongExact, wrong: round2(wrongExact)};
  }
  // A mix of the three currencies, half away from £ and half back to £.
  function cases(n, level, curs = [EUR, USD, JPY]){
    const dirs = shuffle(Array.from({length: n}, (_, i) => i % 2 === 0));
    const list = shuffle(Array.from({length: n}, (_, i) => curs[i % curs.length]));
    return list.map((cur, i) => makeCase(cur, dirs[i], level));
  }

  // The story for a case. f(v, cur) writes an amount: as coloured HTML for the
  // screen, or as words for read-aloud, so both say exactly the same thing.
  const OUT_STORIES = [
    (c, f) => `You have ${f(c.start, GBP)}. Change it into ${c.cur.name}.`,
    (c, f, p) => `${p[0]} is going to ${c.place}. ${p[1]} changes ${f(c.start, GBP)} into ${c.cur.name}.`,
    (c, f) => `How many ${c.cur.name} do you get for ${f(c.start, GBP)}?`,
  ];
  const HOME_STORIES = [
    (c, f) => `You have ${f(c.start, c.cur)}. Change it into pounds.`,
    (c, f, p) => `${p[0]} comes home from ${c.place} with ${f(c.start, c.cur)}. ${p[1]} changes it back into pounds.`,
    (c, f, p, item) => `A ${item} costs ${f(c.start, c.cur)} in ${c.place}. How much is that in pounds?`,
    (c, f) => `How many pounds do you get for ${f(c.start, c.cur)}?`,
  ];
  function story(c){
    c.place = pick(c.cur.places);
    const p = pick(PEOPLE), item = pick(ITEMS), tell = pick(c.out ? OUT_STORIES : HOME_STORIES);
    return {
      html: `${rateHTML(c.cur, c.rate)}<span style="display:block">${tell(c, m, p, item)}</span>`,
      say: `${rateSay(c.cur, c.rate)}. ${tell(c, sayMoney, p, item)}`,
    };
  }
  // The worked answer and the sense check, shown when a question is finished.
  function explainFor(c){
    const op = c.out ? "×" : "÷", r = rateNum(c.cur, c.rate);
    const exactShown = Math.abs(c.exact - c.answer) < 1e-9 ? plainNum(c.exact) : c.exact.toFixed(4).replace(/0+$/, "") + "...";
    const rounded = Math.abs(c.exact - c.answer) < 1e-9 ? "" : ` (rounded to the nearest ${c.to === GBP ? "penny" : "cent"})`;
    return `<div class="sum">${plainNum(c.start)} ${op} ${r} = ${exactShown}</div>
      <p>So ${m(c.start, c.from)} = ${m(c.answer, c.to)}${rounded}.</p>
      <p><b>Sense check:</b> ${amount(c.answer, c.to)} is ${c.out ? "more" : "less"} than ${amount(c.start, c.from)}. ${c.out ? "Away from £, the number gets bigger." : "Back to £, the number gets smaller."} ✓</p>`;
  }

  /* ---------- the steps every question is built from ---------- */
  const startStep = c => ({
    type: "choice", ask: "What money do you start with?",
    options: [{html: `${coin(GBP)}<span>Pounds</span>`}, {html: `${coin(c.cur)}<span>${cap(c.cur.name)}</span>`}],
    answer: c.out ? 0 : 1,
    why: `Look for the money you already have: ${m(c.start, c.from)}. It has a ${c.from.sym} sign, so you start with ${c.from.name}.`,
    doneText: `You start with ${c.from.name} ${coin(c.from)}`,
  });
  const dirOptions = c => [
    {html: `<span class="op">×</span><span>Times ${rateNum(c.cur, c.rate)}<span class="small muted" style="display:block">away from £</span></span>`},
    {html: `<span class="op">÷</span><span>Divide by ${rateNum(c.cur, c.rate)}<span class="small muted" style="display:block">back to £</span></span>`},
  ];
  const ruleFor = c => c.out
    ? `You start with pounds, so you are going <b>away from £</b>. Away from £ means <b>times ×</b>.`
    : `You start with ${c.cur.name} and want pounds, so you are coming <b>back to £</b>. Back to £ means <b>divide ÷</b>.`;
  const dirStep = c => ({
    type: "choice", ask: "Which way across the bridge?",
    options: dirOptions(c), answer: c.out ? 0 : 1, why: ruleFor(c),
    doneText: c.out ? `Away from £, so <b>× ${rateNum(c.cur, c.rate)}</b>` : `Back to £, so <b>÷ ${rateNum(c.cur, c.rate)}</b>`,
  });
  const calcStep = (c, ask) => ({
    type: "number", ask: ask || `Work it out on the calculator. How many ${c.to.name}?`, unit: c.to.sym,
    check(v, info){
      const tol = whole(c.to) ? 0.5 : 0.005;
      if (Math.abs(v - c.answer) <= tol + 1e-9) return {ok: true, summary: `${m(c.start, c.from)} = ${m(c.answer, c.to)}`};
      const fixed = c.answer.toFixed(2);
      if (Math.abs(v - c.exact) < 1e-6) return {soft: true, msg: `Right sum! Money has only 2 numbers after the point, for the pence. So it rounds to <b>${fixed}</b>. Type ${fixed} and press Check.`};
      const sumHint = `Try this on the calculator: <span class="sum">${plainNum(c.start)} ${c.out ? "×" : "÷"} ${rateNum(c.cur, c.rate)} =</span>`;
      if (Math.abs(v - c.wrongExact) < 0.006 || Math.abs(v - c.wrong) < 0.006) {
        return {msg: `That is the answer you get if you ${c.out ? "divide" : "times"}. ${ruleFor(c)}${info.tries >= 1 ? `<br>${sumHint}` : ""}`};
      }
      if (info.tries >= 1) return {msg: sumHint};
      return {msg: "Not quite. Which way are you going: away from £ or back to £? Have a look at the help card if you like."};
    },
  });

  /* ---------- activities ---------- */
  function whichWay(){
    return cases(8, "real").map(c => {
      const s = story(c);
      return {...s,
        visual: r => bridge(c.cur, c.rate, {c, on: r.done ? (c.out ? "out" : "home") : null, reveal: r.done}),
        steps: [startStep(c), dirStep(c)],
        explain: explainFor(c)};
    });
  }
  function moreOrLess(){
    return cases(8, "real").map(c => {
      const s = story(c), n = amount(c.start, c.from);
      const opts = shuffle([c.answer, c.wrong]);
      return {...s,
        visual: r => r.done ? bridge(c.cur, c.rate, {c, on: c.out ? "out" : "home", reveal: true}) : "",
        steps: [
          {type: "choice", ask: `Will the number of ${c.to.name} be more than ${n}, or less than ${n}?`,
            options: [{html: `<span class="op">↑</span><span>More than ${n}</span>`}, {html: `<span class="op">↓</span><span>Less than ${n}</span>`}],
            answer: c.out ? 0 : 1,
            why: c.out ? `£1 buys more than 1 ${c.cur.one}. So away from £, the number gets <b>bigger</b>.`
              : `You need more than 1 ${c.cur.one} to get £1. So back to £, the number gets <b>smaller</b>.`,
            doneText: c.out ? `More than ${n}: away from £, the number gets bigger` : `Less than ${n}: back to £, the number gets smaller`},
          {type: "choice", ask: "So which answer makes sense?",
            options: opts.map(v => ({html: `<span>${m(v, c.to)}</span>`})),
            answer: opts.indexOf(c.answer),
            why: `${m(c.wrong, c.to)} is ${c.out ? "less" : "more"} than ${n}. The answer must be ${c.out ? "more" : "less"} than ${n}.`},
        ],
        explain: explainFor(c)};
    });
  }
  function spotTheSlip(){
    const slips = shuffle([true, true, true, true, false, false, false, false]);
    return cases(8, "real").map((c, i) => {
      const slip = slips[i], shown = slip ? c.wrong : c.answer, [name, he] = pick(PEOPLE);
      const n = amount(c.start, c.from), bigger = c.out ? "bigger" : "smaller";
      const tell = f => `${name} changed ${f(c.start, c.from)} into ${c.to.name}. ${he} got ${f(shown, c.to)}.`;
      return {
        html: `${rateHTML(c.cur, c.rate)}<span style="display:block">${tell(m)}</span>`,
        say: `${rateSay(c.cur, c.rate)}. ${tell(sayMoney)}`,
        visual: r => r.done ? bridge(c.cur, c.rate, {c, on: c.out ? "out" : "home", reveal: true}) : "",
        steps: [
          {type: "choice", ask: `Does ${name}'s answer make sense?`,
            options: [{html: `<span class="op">✓</span><span>Yes, it makes sense</span>`}, {html: `<span class="op">✗</span><span>No, it can't be right</span>`}],
            answer: slip ? 1 : 0,
            why: slip
              ? `${m(shown, c.to)} is ${c.out ? "less" : "more"} than ${n}. ${c.out ? "Away from £" : "Back to £"}, the number should get ${bigger}. So it can't be right.`
              : `${m(shown, c.to)} is ${c.out ? "more" : "less"} than ${n}. ${c.out ? "Away from £" : "Back to £"}, the number gets ${bigger}. So it makes sense.`,
            doneText: slip ? `No: ${m(shown, c.to)} should be ${bigger} than ${n}` : `Yes: ${m(shown, c.to)} is ${bigger} than ${n}`},
          {...dirStep(c), ask: slip ? `What should ${name} do instead?` : `Which sum did ${name} do?`},
        ],
        explain: explainFor(c) + (slip ? `<p>${name} did ${c.out ? "÷" : "×"} by mistake.</p>` : "")};
    });
  }
  function compareQ(){
    const cur = pick([EUR, USD]), rate = cur.real, item = pick(ITEMS.filter(x => x !== "pizza")), place = pick(cur.places);
    const pounds = pick([40, 60, 80, 120, 150, 200]), cheaperAbroad = Math.random() < 0.5;
    const start = Math.round(pounds * rate * (cheaperAbroad ? pick([0.85, 0.9]) : pick([1.1, 1.15])));
    const c = {cur, rate, out: false, from: cur, to: GBP, start, exact: start / rate, answer: round2(start / rate), wrongExact: start * rate, wrong: round2(start * rate)};
    const tell = f => `A ${item} costs ${f(pounds, GBP)} in London. The same ${item} costs ${f(start, cur)} in ${place}. Where is it cheaper?`;
    const there = m(c.answer, GBP), here = m(pounds, GBP);
    return {
      html: `${rateHTML(cur, rate)}<span style="display:block">${tell(m)}</span>`,
      say: `${rateSay(cur, rate)}. ${tell(sayMoney)}`,
      visual: r => r.step >= 1 ? bridge(cur, rate, {c, on: "home", reveal: true}) : "",
      steps: [
        calcStep(c, `First, change ${m(start, cur)} into pounds.`),
        {type: "choice", ask: "Where is it cheaper?",
          options: [{html: `<span>London<span class="small" style="display:block">${here}</span></span>`}, {html: `<span>${place}<span class="small" style="display:block">${there}</span></span>`}],
          answer: cheaperAbroad ? 1 : 0,
          why: cheaperAbroad ? `${there} is less than ${here}, so ${place} is cheaper.` : `${here} is less than ${there}, so London is cheaper.`},
      ],
      explain: explainFor(c) + `<p>${cheaperAbroad ? place : "London"} is cheaper.</p>`};
  }
  function moneyChanger(level){
    if (level === "step") return cases(6, "friendly").map(c => ({...story(c),
      visual: r => bridge(c.cur, c.rate, {c, on: r.step >= 2 || r.done ? (c.out ? "out" : "home") : null, reveal: r.done}),
      steps: [startStep(c), dirStep(c), calcStep(c)], explain: explainFor(c)}));
    if (level === "real") return cases(6, "real").map(c => ({...story(c),
      visual: r => bridge(c.cur, c.rate, {c, on: r.step >= 1 || r.done ? (c.out ? "out" : "home") : null, reveal: r.done}),
      steps: [dirStep(c), calcStep(c)], explain: explainFor(c)}));
    const qs = cases(4, "real").map(c => ({...story(c),
      visual: r => r.done ? bridge(c.cur, c.rate, {c, on: c.out ? "out" : "home", reveal: true}) : "",
      steps: [calcStep(c, `How many ${c.to.name}? Give your answer to the nearest ${c.to === GBP ? "penny" : c.to.small ? "cent" : "yen"}.`)], explain: explainFor(c)}));
    qs.splice(rand(1, 2), 0, compareQ()); qs.push(compareQ());
    return qs;
  }

  /* ---------- learn pages and help card ---------- */
  const steps4 = `<ol class="steps4">
    <li><span>What money do I <b>start</b> with?</span></li>
    <li><span>Am I going <b>away from £</b>, or <b>back to £</b>?</span></li>
    <li><span>Away from £: <b>times ×</b>. Back to £: <b>divide ÷</b>.</span></li>
    <li><span><b>Sense check:</b> the other money should be the bigger number.</span></li></ol>`;
  const ladder = `<table class="ladder"><tbody>
    <tr><td>${m(10, GBP)}</td><td>=</td><td>${m(11.5, EUR)}</td></tr>
    <tr><td>${m(10, GBP)}</td><td>=</td><td>${m(12.7, USD)}</td></tr>
    <tr><td>${m(10, GBP)}</td><td>=</td><td>${m(1900, JPY)}</td></tr></tbody></table>`;
  const ex1 = {cur: EUR, rate: 1.15, out: true, from: GBP, to: EUR, start: 20, answer: 23};
  const ex2 = {cur: EUR, rate: 1.15, out: false, from: EUR, to: GBP, start: 46, answer: 40};

  App.topic({
    id: "exchange-rates", title: "Exchange rates", icon: "£",
    blurb: "Changing pounds into other money, and back again. Know when to times and when to divide.",
    learn: [
      {title: "What is an exchange rate?",
        html: `${rateHTML(EUR, 1.15)}
          <p>This is an <b>exchange rate</b>.</p>
          <p>It tells you that <b>1 pound</b> swaps for <b>1 euro and 15 cents</b>.</p>
          <p class="muted">Pounds are always <span class="m gbp">blue-green</span> in this app. The other money is always <span class="m fx">orange</span>.</p>`,
        say: "This is an exchange rate. 1 pound equals 1 euro and 15 cents. It tells you that 1 pound swaps for 1 euro and 15 cents. Pounds are always blue-green in this app. The other money is always orange."},
      {title: "The pound is home",
        html: `${bridge(EUR, 1.15)}<p>Think of the pound as <b>home</b>.</p>
          <p>Going <b>away from £</b>, you <b>times ×</b>.</p><p>Coming <b>back to £</b>, you <b>divide ÷</b>.</p>${hook(HOOK)}`,
        say: "Think of the pound as home. Going away from pounds, you times. Coming back to pounds, you divide. Away from pounds: times. Back to pounds: divide."},
      {title: "Away from £: times",
        html: `<p>Change ${m(20, GBP)} into euros.</p>${bridge(EUR, 1.15, {c: ex1, on: "out", reveal: true})}
          <p>You start with pounds. You are going away from £, so times.</p><div class="sum">20 × 1.15 = 23</div><p>So ${m(20, GBP)} = ${m(23, EUR)}.</p>`,
        say: "Change 20 pounds into euros. You start with pounds. You are going away from pounds, so times. 20 times 1.15 equals 23. So 20 pounds equals 23 euros."},
      {title: "Back to £: divide",
        html: `<p>Change ${m(46, EUR)} into pounds.</p>${bridge(EUR, 1.15, {c: ex2, on: "home", reveal: true})}
          <p>You start with euros. You are coming back to £, so divide.</p><div class="sum">46 ÷ 1.15 = 40</div><p>So ${m(46, EUR)} = ${m(40, GBP)}.</p>`,
        say: "Change 46 euros into pounds. You start with euros. You are coming back to pounds, so divide. 46 divided by 1.15 equals 40. So 46 euros equals 40 pounds."},
      {title: "The sense check",
        html: `<p>£1 is worth more than 1 euro, 1 dollar or 1 yen.</p>${ladder}
          <p>So the other money is always the <b>bigger number</b>.</p>
          <p>Away from £, the number gets <b>bigger</b>. Back to £, it gets <b>smaller</b>.</p>`,
        say: "1 pound is worth more than 1 euro, 1 dollar or 1 yen. 10 pounds equals 11 euros 50, or 12 dollars 70, or 1900 yen. So the other money is always the bigger number. Away from pounds, the number gets bigger. Back to pounds, it gets smaller."},
      {title: "Four steps, every time",
        html: `${steps4}${hook(HOOK)}<p class="muted">You can open this on the help card during any question.</p>`,
        say: "Four steps, every time. One: what money do I start with? Two: am I going away from pounds, or back to pounds? Three: away from pounds, times. Back to pounds, divide. Four: sense check. The other money should be the bigger number."},
    ],
    help: {
      title: "Times or divide?",
      html: `${bridge(EUR, 1.15)}${steps4}${hook(HOOK)}`,
      say: "Times or divide? One: what money do I start with? Two: am I going away from pounds, or back to pounds? Three: away from pounds, times. Back to pounds, divide. Four: sense check. The other money should be the bigger number.",
    },
    activities: [
      {id: "which-way", title: "Which way?", blurb: "Decide if you times or divide. No sums to work out.", make: whichWay},
      {id: "more-or-less", title: "More or less?", blurb: "Will the answer be bigger or smaller? Then pick the answer that makes sense.", make: moreOrLess},
      {id: "spot-the-slip", title: "Spot the slip", blurb: "Someone has changed some money. Did they get it right?", make: spotTheSlip},
      {id: "money-changer", title: "Money changer", blurb: "Work out the answer with the calculator.", make: moneyChanger,
        levels: [
          {id: "step", name: "Step by step", blurb: "Easy rates, with help"},
          {id: "real", name: "Real rates", blurb: "Round to the penny"},
          {id: "exam", name: "Exam style", blurb: "Just you and the calculator"},
        ]},
    ],
  });
})();
