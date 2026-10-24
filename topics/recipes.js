"use strict";
// Topic: recipes. The aim is to change a recipe for a different number of
// people with one method that always works: find the amount for 1 person
// first (divide by the people in the recipe), then times by the new number
// of people. One picture is used on every screen, the "recipe ladder":
// recipe → 1 person → new number of people. People are always teal and
// amounts of food are always orange. The sense check backs it up: more
// people need more food, fewer people need less.
(() => {
  const {pick, shuffle, rand, I} = App.util;

  const INGREDIENTS = {
    flour: {name: "flour", unit: "g"}, sugar: {name: "sugar", unit: "g"}, butter: {name: "butter", unit: "g"},
    oats: {name: "oats", unit: "g"}, chocolate: {name: "chocolate", unit: "g"}, rice: {name: "rice", unit: "g"},
    pasta: {name: "pasta", unit: "g"}, cheese: {name: "cheese", unit: "g"},
    milk: {name: "milk", unit: "ml"}, stock: {name: "stock", unit: "ml"},
    eggs: {name: "eggs", unit: "", count: true},
  };
  const DISHES = [
    {name: "pancakes", has: ["flour", "milk", "sugar", "eggs"]},
    {name: "cookies", has: ["flour", "butter", "sugar", "chocolate", "eggs"]},
    {name: "flapjacks", has: ["oats", "butter", "sugar"]},
    {name: "pasta bake", has: ["pasta", "cheese", "milk"]},
    {name: "risotto", has: ["rice", "stock", "cheese", "butter"]},
    {name: "brownies", has: ["chocolate", "butter", "sugar", "flour", "eggs"]},
  ];
  const PEOPLE = [["Mia", "She", "she"], ["Leo", "He", "he"], ["Priya", "She", "she"], ["Sam", "He", "he"], ["Ava", "She", "she"], ["Josh", "He", "he"], ["Zara", "She", "she"], ["Ben", "He", "he"]];

  /* ---------- numbers, colours and words ---------- */
  const num = v => String(Number(v.toFixed(2)));
  const near = (a, b) => Math.abs(a - b) < 0.006;
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const peopleText = n => n === 1 ? "1 person" : `${n} people`;
  const amountText = (v, ing) => ing.count ? `${num(v)} ${v === 1 ? "egg" : "eggs"}` : `${num(v)} ${ing.unit}`;
  const sayAmount = (v, ing) => ing.count ? amountText(v, ing) : `${num(v)} ${ing.unit === "g" ? "grams" : "millilitres"}`;
  // HTML: people in teal, food in orange.
  const P = n => `<span class="m gbp">${peopleText(n)}</span>`;
  const A = (v, ing) => `<span class="m fx">${amountText(v, ing)}</span>`;
  // "200 g of flour" or "3 eggs", in HTML (f = A) or words (f = sayAmount).
  const withName = (v, ing, f) => ing.count ? f(v, ing) : `${f(v, ing)} of ${ing.name}`;
  const howMuch = ing => ing.count ? "How many eggs" : `How much ${ing.name}`;

  /* ---------- the recipe ladder ---------- */
  // on: "one" lights up ÷ (find 1 person), "new" lights up × (the new number of people).
  // showOne / showNew show those amounts instead of "?".
  function ladder(c, {on = null, showOne = false, showNew = false} = {}){
    const step = (which, op, label) => `<div class="rstep ${on ? (on === which ? "on" : "off") : ""}"><span class="opt">${op}</span><div class="arrow r"></div><small>${label}</small></div>`;
    return `<div class="ladder3" role="img" aria-label="Recipe for ${peopleText(c.old)}, divide by ${c.old} to find 1 person, then times by ${c.nw} for ${peopleText(c.nw)}.">
      <div class="rbox start"><small>Recipe</small>${P(c.old)}${A(c.amount, c.ing)}</div>
      ${step("one", `÷ ${c.old}`, `share between ${c.old}`)}
      <div class="rbox one"><small>Find 1 first</small>${P(1)}${showOne ? A(c.per, c.ing) : `<span class="m fx">?</span>`}</div>
      ${step("new", `× ${c.nw}`, `${c.nw} lots of 1 person`)}
      <div class="rbox goal"><small>New</small>${P(c.nw)}${showNew ? A(c.answer, c.ing) : `<span class="m fx">?</span>`}</div>
    </div>`;
  }
  const hook = text => `<div class="hook">${I.bulb}<span>${text}</span></div>`;
  const HOOK = "Find 1 person first, then times.";

  /* ---------- making questions ---------- */
  // level "easy": the amount for 1 person is a whole number. level "real":
  // it can be a decimal, and sometimes the ingredient is eggs.
  function makeCase(level, more){
    for (;;){
      const dish = pick(DISHES);
      const eggs = level === "real" && dish.has.includes("eggs") && Math.random() < 0.25;
      const ing = INGREDIENTS[eggs ? "eggs" : pick(dish.has.filter(x => x !== "eggs"))];
      let old, amount;
      if (eggs){ old = pick([2, 3, 4, 6, 8]); amount = pick([2, 3, 4, 6]); }
      else if (level === "easy"){ old = pick([2, 3, 4, 5, 10]); amount = old * pick(ing.unit === "ml" ? [25, 50, 75, 100, 150] : [10, 15, 20, 25, 30, 40, 50, 60, 75, 100]); }
      else { old = pick([3, 4, 5, 6, 8, 10, 12]); amount = pick(ing.unit === "ml" ? [150, 200, 250, 300, 400, 450, 500, 600, 750] : [90, 100, 120, 150, 180, 200, 225, 250, 300, 350, 400, 450, 500]); }
      const nw = more ? rand(old + 1, Math.max(old + 2, old * 3)) : rand(2, old - 1);
      if (nw < 2 || nw === old) continue;
      const per = amount / old, answer = Number((amount * nw / old).toFixed(6));
      if (!near(per * 100, Math.round(per * 100))) continue;              // 1 person: at most 2 decimal places
      if (!near(answer * 10, Math.round(answer * 10))) continue;          // answer: at most 1 decimal place
      if (eggs && !Number.isInteger(answer)) continue;                    // no half eggs in an answer
      if (level === "real" && Number.isInteger(per) && Math.random() < 0.5) continue;  // mostly decimals
      return {dish, ing, old, nw, amount, per: Number(per.toFixed(6)), answer, more: nw > old,
        inverse: Number((amount * old / nw).toFixed(2)), noDivide: amount * nw, added: amount + nw - old};
    }
  }
  const cases = (n, level) => shuffle(Array.from({length: n}, (_, i) => i % 2 === 0)).map(more => makeCase(level, more));

  const STORIES = [
    (c, f, p) => `${howMuch(c.ing)} do you need for ${p(c.nw)}?`,
    (c, f, p, who) => `${who[0]} is making ${c.dish.name} for ${p(c.nw)}. ${howMuch(c.ing)} does ${who[2]} need?`,
    (c, f, p) => `You want to make ${c.dish.name} for ${p(c.nw)}. ${howMuch(c.ing)} do you need?`,
  ];
  const recipeHTML = c => `<span class="rate"><span>${cap(c.dish.name)} for ${P(c.old)}: ${withName(c.amount, c.ing, A)}</span></span>`;
  const recipeSay = c => `A recipe for ${c.dish.name} for ${peopleText(c.old)} uses ${withName(c.amount, c.ing, sayAmount)}.`;
  function story(c){
    const tell = pick(STORIES), who = pick(PEOPLE);
    return {
      html: `${recipeHTML(c)}<span style="display:block">${tell(c, A, P, who)}</span>`,
      say: `${recipeSay(c)} ${tell(c, sayAmount, peopleText, who)}`,
    };
  }
  function explainFor(c){
    return `<div class="sum">${num(c.amount)} ÷ ${c.old} = ${num(c.per)}</div>
      <div class="sum">${num(c.per)} × ${c.nw} = ${num(c.answer)}</div>
      <p>So ${P(c.nw)} need ${withName(c.answer, c.ing, A)}.</p>
      <p><b>Sense check:</b> ${peopleText(c.nw)} is ${c.more ? "more" : "fewer"} than ${peopleText(c.old)}, and ${amountText(c.answer, c.ing)} is ${c.more ? "more" : "less"} than ${amountText(c.amount, c.ing)}. ✓</p>`;
  }

  /* ---------- the steps every question is built from ---------- */
  const moreLessStep = c => ({
    type: "choice", ask: `Will you need more than ${A(c.amount, c.ing)}, or less?`,
    say: `Will you need more than ${sayAmount(c.amount, c.ing)}, or less?`,
    options: [{html: `<span class="op">↑</span><span>More</span>`}, {html: `<span class="op">↓</span><span>Less</span>`}],
    answer: c.more ? 0 : 1,
    why: c.more ? `${P(c.nw)} is more than ${P(c.old)}. More people need <b>more</b> food.` : `${P(c.nw)} is fewer than ${P(c.old)}. Fewer people need <b>less</b> food.`,
    doneText: c.more ? `More people, so <b>more</b> ${c.ing.name}` : `Fewer people, so <b>less</b> ${c.ing.name}`,
  });
  // Two options in a random order, so the right answer isn't always first.
  function opChoice(ask, right, wrong, why, doneText){
    const opts = shuffle([right, wrong]);
    return {type: "choice", ask, options: opts.map(o => ({html: `<span class="op">${o[0]}</span><span>${o[1]}</span>`})), answer: opts.indexOf(right), why, doneText};
  }
  const divideStep = c => opChoice("First, find the amount for 1 person. Which sum?",
    ["÷", `Divide by ${c.old}<span class="small muted" style="display:block">share between ${c.old}</span>`],
    ["×", `Times by ${c.old}`],
    `The recipe is shared between ${P(c.old)}. Sharing means <b>divide</b>, so ÷ ${c.old}.`,
    `Share between ${c.old}, so <b>÷ ${c.old}</b>`);
  const timesStep = c => opChoice(`Now for ${P(c.nw)}. Which sum?`,
    ["×", `Times by ${c.nw}<span class="small muted" style="display:block">${c.nw} lots of 1 person</span>`],
    ["÷", `Divide by ${c.nw}`],
    `1 person needs ${A(c.per, c.ing)}. ${P(c.nw)} need ${c.nw} lots of that, so <b>times</b> by ${c.nw}.`,
    `${c.nw} lots of 1 person, so <b>× ${c.nw}</b>`);
  const sumHint = (...parts) => `Try this on the calculator: <span class="sum">${parts.join(" ")} =</span>`;
  const after = c => c.ing.count ? "eggs" : c.ing.unit;
  const calcOne = c => ({
    type: "number", ask: `${howMuch(c.ing)} for 1 person? Use the calculator.`, after: after(c),
    check(v, info){
      if (near(v, c.per)) return {ok: true, summary: `1 person needs ${A(c.per, c.ing)}`};
      const hint = sumHint(num(c.amount), "÷", c.old);
      if (near(v, c.amount * c.old)) return {msg: `That is times. To share between ${c.old} people, <b>divide</b> by ${c.old}.${info.tries >= 1 ? `<br>${hint}` : ""}`};
      if (info.tries >= 1) return {msg: hint};
      return {msg: `Not quite. Share ${A(c.amount, c.ing)} between ${P(c.old)}. Which sum is that?`};
    },
  });
  // withOne: the amount for 1 person has already been found in an earlier step.
  const calcNew = (c, withOne, ask) => ({
    type: "number", ask: ask || `${howMuch(c.ing)} for ${P(c.nw)}? Use the calculator.`, after: after(c),
    check(v, info){
      if (near(v, c.answer)) return {ok: true, summary: `${P(c.nw)} need ${A(c.answer, c.ing)}`};
      const fullSum = withOne ? sumHint(num(c.per), "×", c.nw) : sumHint(num(c.amount), "÷", c.old, "×", c.nw);
      const extra = info.tries >= 1 ? `<br>${fullSum}` : "";
      if (near(v, c.per)) return {msg: `That is the amount for 1 person. Now <b>times</b> by ${c.nw}.${extra}`};
      if (near(v, c.noDivide)) return {msg: `First find 1 person: <b>divide</b> by ${c.old}. Then times by ${c.nw}.${extra}`};
      if (near(v, c.inverse)) return {msg: `That is ${c.more ? "less" : "more"} than ${A(c.amount, c.ing)}, but ${c.more ? "more people need more" : "fewer people need less"}.${extra}`};
      if (near(v, c.added)) return {msg: `Adding on the extra people doesn't work for recipes. Find 1 person first, then times.${extra}`};
      if (info.tries >= 1) return {msg: fullSum};
      return {msg: "Not quite. Find 1 person first, then times. Have a look at the help card if you like."};
    },
  });

  /* ---------- activities ---------- */
  function moreOrLess(){
    return cases(8, "easy").map(c => {
      const opts = shuffle([c.answer, c.inverse]);
      return {...story(c),
        visual: r => r.done ? ladder(c, {showOne: true, showNew: true}) : "",
        steps: [moreLessStep(c), {type: "choice", ask: "So which answer makes sense?",
          options: opts.map(v => ({html: `<span>${A(v, c.ing)}</span>`})), answer: opts.indexOf(c.answer),
          why: `${A(c.inverse, c.ing)} is ${c.more ? "less" : "more"} than ${A(c.amount, c.ing)}. ${c.more ? "More people need more food." : "Fewer people need less food."}`}],
        explain: explainFor(c)};
    });
  }
  function findOne(){
    return cases(8, "easy").map(c => ({
      html: `${recipeHTML(c)}<span style="display:block">${howMuch(c.ing)} does 1 person need?</span>`,
      say: `${recipeSay(c)} ${howMuch(c.ing)} does 1 person need?`,
      visual: r => ladder(c, {on: r.step >= 1 || r.done ? "one" : null, showOne: r.done}),
      steps: [divideStep(c), calcOne(c)],
      explain: `<div class="sum">${num(c.amount)} ÷ ${c.old} = ${num(c.per)}</div><p>So 1 person needs ${withName(c.per, c.ing, A)}.</p>
        <p><b>Sense check:</b> 1 person needs less than ${P(c.old)}. ✓</p>`,
    }));
  }
  function scaler(level){
    if (level === "step") return cases(6, "easy").map(c => ({...story(c),
      visual: r => ladder(c, {on: r.done ? null : r.step >= 3 ? "new" : r.step >= 1 ? "one" : null, showOne: r.step >= 3 || r.done, showNew: r.done}),
      steps: [moreLessStep(c), divideStep(c), calcOne(c), timesStep(c), calcNew(c, true)], explain: explainFor(c)}));
    if (level === "real") return cases(6, "real").map(c => ({...story(c),
      visual: r => ladder(c, {on: r.done ? null : r.step >= 1 ? "new" : "one", showOne: r.step >= 1 || r.done, showNew: r.done}),
      steps: [calcOne(c), calcNew(c, true)], explain: explainFor(c)}));
    return cases(6, "real").map(c => ({...story(c),
      visual: r => r.done ? ladder(c, {showOne: true, showNew: true}) : "",
      steps: [calcNew(c, false)], explain: explainFor(c)}));
  }
  function enoughQ(ok){
    for (;;){
      const c = makeCase("real", Math.random() < 0.5), who = pick(PEOPLE);
      const gap = c.ing.count ? pick([1, 2]) : pick(c.answer >= 200 ? [10, 20, 25, 50] : [5, 10, 20]);
      const has = ok ? c.answer + gap : c.answer - gap;
      if (has <= 0) continue;
      const tell = (f, p) => `${who[0]} wants to make ${c.dish.name} for ${p(c.nw)}. ${who[1]} has ${withName(has, c.ing, f)}. Has ${who[2]} got enough?`;
      return {
        html: `${recipeHTML(c)}<span style="display:block">${tell(A, P)}</span>`,
        say: `${recipeSay(c)} ${tell(sayAmount, peopleText)}`,
        visual: r => r.step >= 1 ? ladder(c, {showOne: true, showNew: true}) : "",
        steps: [
          calcNew(c, false, `First, ${howMuch(c.ing).toLowerCase()} is needed for ${P(c.nw)}?`),
          {type: "choice", ask: `${who[0]} has ${A(has, c.ing)}. Is that enough?`,
            options: [{html: `<span class="op">✓</span><span>Yes, enough</span>`}, {html: `<span class="op">✗</span><span>No, not enough</span>`}],
            answer: ok ? 0 : 1,
            why: `${P(c.nw)} need ${A(c.answer, c.ing)}. ${who[0]} has ${A(has, c.ing)}, which is ${ok ? "more" : "less"}. So ${ok ? "it is enough" : "it is not enough"}.`},
        ],
        explain: explainFor(c) + `<p>${who[0]} has ${A(has, c.ing)}, so ${who[2]} ${ok ? "has enough" : "does not have enough"}.</p>`,
      };
    }
  }
  const enough = () => shuffle([true, true, true, false, false, false]).map(enoughQ);

  /* ---------- learn pages and help card ---------- */
  const ex = {dish: DISHES[0], ing: INGREDIENTS.flour, old: 4, nw: 6, amount: 200, per: 50, answer: 300};
  const exLess = {dish: DISHES[0], ing: INGREDIENTS.milk, old: 4, nw: 2, amount: 300, per: 75, answer: 150};
  const steps4 = `<ol class="steps4">
    <li><span>More people or fewer? So <b>more</b> food or <b>less</b>?</span></li>
    <li><span>Find <b>1 person</b>: divide by the people in the recipe.</span></li>
    <li><span>Then <b>times</b> by the new number of people.</span></li>
    <li><span><b>Sense check:</b> more people, more food. Fewer people, less food.</span></li></ol>`;

  App.topic({
    id: "recipes", title: "Recipes", icon: "🍪",
    blurb: "Changing a recipe for more people or fewer people. Find 1 person first, then times.",
    learn: [
      {title: "What a recipe tells you",
        html: `<div class="recipe"><b>Pancakes</b><span>Serves ${P(4)}</span><ul><li>${A(200, INGREDIENTS.flour)} flour</li><li>${A(300, INGREDIENTS.milk)} milk</li><li>${A(2, INGREDIENTS.eggs)}</li></ul></div>
          <p><b>Serves 4</b> means it makes enough for 4 people.</p>
          <p>For a different number of people, every amount changes.</p>
          <p class="muted">People are always <span class="m gbp">blue-green</span> in this app. Food is always <span class="m fx">orange</span>.</p>`,
        say: "Pancakes. Serves 4 people. 200 grams of flour, 300 millilitres of milk, 2 eggs. Serves 4 means it makes enough for 4 people. For a different number of people, every amount changes. People are always blue-green in this app. Food is always orange."},
      {title: "Find 1 person first",
        html: `<p>Pancakes for ${P(4)} use ${A(200, INGREDIENTS.flour)} flour. How much for ${P(6)}?</p>${ladder(ex, {on: "one", showOne: true})}
          <p>Share the flour between 4 people: <b>divide by 4</b>.</p><div class="sum">200 ÷ 4 = 50</div><p>1 person needs ${A(50, INGREDIENTS.flour)}.</p>`,
        say: "Pancakes for 4 people use 200 grams of flour. How much for 6 people? First, share the flour between 4 people: divide by 4. 200 divided by 4 equals 50. 1 person needs 50 grams."},
      {title: "Then times",
        html: `${ladder(ex, {on: "new", showOne: true, showNew: true})}<p>6 people need 6 lots of 1 person: <b>times by 6</b>.</p>
          <div class="sum">50 × 6 = 300</div><p>So ${P(6)} need ${A(300, INGREDIENTS.flour)} flour.</p>${hook(HOOK)}`,
        say: "6 people need 6 lots of 1 person: times by 6. 50 times 6 equals 300. So 6 people need 300 grams of flour. Find 1 person first, then times."},
      {title: "Fewer people works the same way",
        html: `<p>Pancakes for ${P(4)} use ${A(300, INGREDIENTS.milk)} milk. How much for ${P(2)}?</p>${ladder(exLess, {showOne: true, showNew: true})}
          <div class="sum">300 ÷ 4 = 75</div><div class="sum">75 × 2 = 150</div><p>So ${P(2)} need ${A(150, INGREDIENTS.milk)} milk. The same two steps, every time.</p>`,
        say: "Pancakes for 4 people use 300 millilitres of milk. How much for 2 people? 300 divided by 4 equals 75. 75 times 2 equals 150. So 2 people need 150 millilitres of milk. The same two steps, every time."},
      {title: "The sense check",
        html: `<p><b>More people</b> need <b>more food</b>.</p><p><b>Fewer people</b> need <b>less food</b>.</p>
          <p>Before you work it out, ask: should my answer be bigger or smaller than the recipe?</p>
          <p class="muted">${P(6)} is more than ${P(4)}, so the answer must be more than ${A(200, INGREDIENTS.flour)}.</p>`,
        say: "More people need more food. Fewer people need less food. Before you work it out, ask: should my answer be bigger or smaller than the recipe? 6 people is more than 4 people, so the answer must be more than 200 grams."},
      {title: "Four steps, every time",
        html: `${steps4}${hook(HOOK)}<p class="muted">You can open this on the help card during any question.</p>`,
        say: "Four steps, every time. One: more people or fewer? So more food or less? Two: find 1 person. Divide by the people in the recipe. Three: then times by the new number of people. Four: sense check. More people, more food. Fewer people, less food."},
    ],
    help: {
      title: "Find 1 person first",
      html: `${ladder(ex, {showOne: true, showNew: true})}${steps4}${hook(HOOK)}`,
      say: "Find 1 person first. One: more people or fewer? So more food or less? Two: find 1 person. Divide by the people in the recipe. Three: then times by the new number of people. Four: sense check. More people, more food. Fewer people, less food.",
    },
    activities: [
      {id: "more-or-less", title: "More or less?", blurb: "Will you need more food or less? Then pick the answer that makes sense.", make: moreOrLess},
      {id: "find-one", title: "Find 1 person", blurb: "Share the recipe out to find how much 1 person needs.", make: findOne},
      {id: "scaler", title: "Recipe changer", blurb: "Change a recipe for a new number of people, with the calculator.", make: scaler,
        levels: [
          {id: "step", name: "Step by step", blurb: "Easy numbers, with help"},
          {id: "real", name: "Find 1, then times", blurb: "Harder numbers"},
          {id: "exam", name: "Exam style", blurb: "Just you and the calculator"},
        ]},
      {id: "enough", title: "Have I got enough?", blurb: "Work out what is needed, then decide if there is enough.", make: enough},
    ],
  });
})();
