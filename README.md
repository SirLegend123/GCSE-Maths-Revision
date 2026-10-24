# GCSE Maths Revision

A calm maths revision app made for one student who is dyslexic and dyscalculic, with topics added over time. There are no timers and no lost points: a wrong answer gets a short explanation and another try. Each topic has a few short **Learn it** pages with pictures, a **Help card** that can be opened during any question, and a set of games. Every question is broken into small steps, one decision at a time. Everything can be read aloud, and the settings cover background colour, light or dark, text size, wider letter spacing, reading each question aloud by itself, and sounds. She can move on whenever she has got it: **Skip this question**, **I've got it: finish this game** (skipped questions don't count, and stars need at least 3 answered questions), and **I've got it: skip to the games** on the learn pages. Stars are saved on the device.

The first topic is **Exchange rates**, built around knowing when to multiply and when to divide. Every screen uses the same picture, the "money bridge": the pound is home, going **away from £ is ×** the rate and coming **back to £ is ÷** the rate. Pounds are always teal and the other money (euros, dollars, yen) is always orange. A sense check backs up the rule: £1 is worth more than 1 of the other money, so the other number is always the bigger one. The games build up in order:

1. **Which way?** Pick the starting money, then times or divide. No sums.
2. **More or less?** Will the answer be bigger or smaller? Then pick the answer that makes sense.
3. **Spot the slip.** Someone has changed some money: does their answer make sense, and what should they have done?
4. **Money changer.** Work out the answer on the built-in calculator, at three levels: *Step by step* (easy rates, with every step prompted), *Real rates* (rounding to the penny) and *Exam style* (no prompts, plus "where is it cheaper?" questions). If the calculator answer is what you'd get from the wrong sum, it says so.

The second topic is **Recipes**: changing a recipe for more people or fewer people. It uses one method that always works, shown in a "recipe ladder" on every screen: **find 1 person first** (divide by the number of people in the recipe), **then times** by the new number of people. People are always teal and amounts of food are always orange. The sense check is that more people need more food and fewer people need less. The games are:

1. **More or less?** Will you need more food or less? Then pick the answer that makes sense.
2. **Find 1 person.** Share the recipe out to find how much 1 person needs.
3. **Recipe changer.** At three levels: *Step by step* (easy numbers, every step prompted), *Find 1, then times* (harder numbers and decimals) and *Exam style* (no prompts). If the answer is one of the usual slips (stopping at 1 person, forgetting to divide, adding on the extra people), it says so.
4. **Have I got enough?** Work out what is needed, then decide whether there is enough.

To add a topic, copy `topics/exchange-rates.js` as a starting point, write the new topic's learn pages, help card and games in it, and add a `<script>` line for it in `index.html`. The comment at the top of `app.js` explains how a question and its steps are written.

## Running it

Everything is plain HTML and JavaScript, with nothing to install. Open `index.html` in a browser, or publish it with GitHub Pages: in **Settings → Pages**, set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, and press **Save**. The app is then at https://sirlegend123.github.io/GCSE-Maths-Revision/.
