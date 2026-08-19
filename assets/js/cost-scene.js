/* Bankwest home — "What does a home actually cost?"
   Up builds this as 53 pre-drawn SVG frames swapped one at a time. This is a
   single composed scene instead: every part carries its own price threshold in
   data-from / data-to, so parts appear and disappear individually and animate
   in on their own rather than the whole picture flipping. */

(function () {
  const { fmt, finance, animateNumber } = window.bw;

  const RATE = 6.24;      // Simple Home Loan, owner-occupier variable
  const YEARS = 30;
  const LVR = 0.80;       // the slider assumes an 80% loan
  const LEGALS = 3300;    // same figures the Deposit Saver projection uses
  const MOVING = 1500;
  const DTI = 0.43;       // gross income guide: annual repayments / 0.43

  // Each tier names the dwelling and what arrives at that price.
  const TIERS = [
    { at: 200000,  label: 'A studio',            adds: 'one room, one window and a letterbox' },
    { at: 400000,  label: 'A townhouse',         adds: 'a pitched roof, a tree and a front path' },
    { at: 700000,  label: 'Detached',            adds: 'a side extension, a fence and a second tree' },
    { at: 1100000, label: 'Detached, off-street', adds: 'a carport, the car and solar on the extension' },
    { at: 1600000, label: 'Two storeys',         adds: 'an upper floor, a balcony, a bike and a dog' },
    { at: 2200000, label: 'Two storeys and a pool', adds: 'a deck, a pool, another tree and birds' },
    { at: 3000000, label: 'The lot',             adds: 'a studio out back, a hedge run and sunshine' }
  ];

  const $ = (id) => document.getElementById(id);
  const range = $('scene-range');
  if (!range) return;

  const scene = $('cost-scene');
  const figure = $('scene-figure');
  const parts = [...scene.querySelectorAll('.sc')];
  const bubble = $('scene-bubble');
  const priceOut = $('scene-price');
  const caption = $('scene-caption');
  const ticksEl = $('scene-ticks');
  const out = { repay: $('cost-repay'), upfront: $('cost-upfront'), income: $('cost-income') };

  const MIN = Number(range.min);
  const MAX = Number(range.max);

  /* --------------------------------------------------------------- ticks */

  TIERS.forEach((t) => {
    const tick = document.createElement('span');
    tick.style.left = `${((t.at - MIN) / (MAX - MIN)) * 100}%`;
    tick.dataset.at = String(t.at);
    ticksEl.appendChild(tick);
  });
  const tickEls = [...ticksEl.children];

  /* --------------------------------------------------------------- model */

  function costs(price) {
    const loan = price * LVR;
    const deposit = price * (1 - LVR);
    const duty = finance.stampDuty(price, false);
    const repay = finance.repayment(loan, RATE, YEARS);
    return {
      loan, deposit, duty, repay,
      upfront: deposit + duty + LEGALS + MOVING,
      income: (repay * 12) / DTI
    };
  }

  /* -------------------------------------------------------------- render */

  function render() {
    const price = Number(range.value);
    const p = (price - MIN) / (MAX - MIN);

    // Toggle each scene part against its own window.
    parts.forEach((el) => {
      const from = Number(el.dataset.from || 0);
      const to = el.dataset.to ? Number(el.dataset.to) : Infinity;
      el.classList.toggle('on', price >= from && price < to);
    });

    tickEls.forEach((t) => { t.dataset.reached = String(price >= Number(t.dataset.at)); });

    bubble.style.setProperty('--p', String(p));
    priceOut.textContent = fmt.money(price);

    const tier = TIERS.filter((t) => price >= t.at).pop() || TIERS[0];
    caption.innerHTML = `<strong>${tier.label}.</strong> At ${fmt.money(price)} you've got ${tier.adds}.`;

    const c = costs(price);
    animateNumber(out.repay, c.repay, fmt.money, 320);
    animateNumber(out.upfront, c.upfront, fmt.money, 320);
    animateNumber(out.income, c.income, fmt.money, 320);

    pan(price);
  }

  /* On narrow screens the scene overflows its scroller, so track the build
     rightwards as the block grows. No-op once it fits. */
  function pan(price) {
    const max = figure.scrollWidth - figure.clientWidth;
    if (max <= 1) return;
    const start = 700000;
    const t = Math.min(1, Math.max(0, (price - start) / (MAX - start)));
    figure.scrollLeft = max * t;
  }

  range.addEventListener('input', render);
  render();
})();
