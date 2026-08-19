/* Bankwest home — Home Zone
   A borrowing estimate derived from (simulated) transaction data rather than
   from a form the customer fills in. The point of the model below is that it
   mirrors what an assessor actually does: shade the income, strip the one-offs,
   floor the expenses at the benchmark, and test it at a buffered rate. */

(function () {
  const { fmt, finance, animateNumber } = window.bw;

  /* ------------------------------------------------------------- data --- */

  // What twelve months of transactions resolved to.
  const INCOME = {
    salary: 8940,          // net, averaged over 26 fortnightly credits
    interestGross: 65,     // savings interest
    interestShading: 0.80, // non-salary income is counted at 80%
    bonus: 6400            // one-off, deliberately not annualised
  };

  const SPEND = [
    { id: 'groceries', name: 'Groceries',                 detail: 'Coles, Woolworths, IGA · 142 transactions', amount: 812, essential: true,  colour: 'var(--c-banana)' },
    { id: 'transport', name: 'Transport & fuel',          detail: 'Fuel, Opal, tolls · 96 transactions',       amount: 268, essential: true,  colour: 'var(--c-powder)' },
    { id: 'utilities', name: 'Utilities',                 detail: 'Electricity, gas, water · 18 debits',       amount: 310, essential: true,  colour: 'var(--c-teal)' },
    { id: 'insurance', name: 'Insurance',                 detail: 'Car, contents, health · 24 debits',         amount: 186, essential: true,  colour: 'var(--c-lavender)' },
    { id: 'telco',     name: 'Phone & internet',          detail: 'Two direct debits · 24 debits',             amount: 145, essential: true,  colour: 'var(--c-powder)' },
    { id: 'health',    name: 'Health & medical',          detail: 'Pharmacy, GP gaps · 31 transactions',       amount: 121, essential: true,  colour: 'var(--c-piglet)' },
    { id: 'dining',    name: 'Dining & takeaway',         detail: 'Recurring · 188 transactions',              amount: 468, essential: false, colour: 'var(--c-orange)' },
    { id: 'ent',       name: 'Entertainment & subscriptions', detail: 'Recurring · 9 subscriptions',           amount: 194, essential: false, colour: 'var(--c-lavender)' },
    { id: 'shopping',  name: 'Shopping & personal',       detail: 'Recurring · 74 transactions',               amount: 386, essential: false, colour: 'var(--c-piglet)' },
    { id: 'travel',    name: 'Travel & weekends away',    detail: 'Recurring pattern, annualised',             amount: 210, essential: false, colour: 'var(--c-teal)' }
  ];

  // Household expenditure benchmark floors, monthly. Illustrative.
  const HEM = { single: 2450, couple: 3200, perDependant: 620 };

  const RATES = { live: 6.24, invest: 6.49 };
  const BUFFER = 3.00;            // added to the product rate for assessment
  const CC_ASSESS_RATE = 0.038;   // monthly, applied to the limit not the balance
  const RANGE_SPREAD = 0.055;     // ± on the headline estimate
  const MAX_LVR = 0.95;

  const kept = new Set(SPEND.map((s) => s.id)); // categories still counted

  /* --------------------------------------------------------------- dom --- */

  const $ = (id) => document.getElementById(id);
  const el = {
    scanBtn: $('scan-btn'), scanBtnLabel: $('scan-btn').querySelector('.btn__label'),
    scanStatus: $('scan-status'), scanMeter: $('scan-meter'), scanNote: $('scan-note'),
    zone: $('zone'), readDate: $('read-date'),
    ledger: $('spend-ledger'),
    incomeTotal: $('income-total'),
    observed: $('spend-observed'), hem: $('spend-hem'), assessed: $('spend-assessed'), hemNote: $('hem-note'),
    household: $('household'), dependants: $('dependants'),
    partnerField: $('partner-field'), partnerIncome: $('partner-income'), partnerOut: $('partner-income-out'),
    cc: $('cc-limit'), ccOut: $('cc-limit-out'),
    otherDebt: $('other-debt'), otherDebtOut: $('other-debt-out'),
    hecs: $('hecs'), hecsOut: $('hecs-out'),
    purpose: $('purpose'), term: $('term'), deposit: $('deposit'),
    bpMain: $('bp-main'), bpRange: $('bp-range'), bpMeter: $('bp-meter'), bpAssess: $('bp-assess'),
    chart: $('alloc-chart'),
    rIncome: $('r-income'), rExpenses: $('r-expenses'), rCommit: $('r-commit'), rSurplus: $('r-surplus'),
    rPrice: $('r-price'), rDeposit: $('r-deposit'), rLvr: $('r-lvr'), rLmi: $('r-lmi'), rRepay: $('r-repay'),
    levers: $('levers')
  };

  /* -------------------------------------------------------------- model -- */

  /** Present value of an annuity — how much loan a monthly surplus supports. */
  function loanFor(monthly, annualRatePct, years) {
    if (monthly <= 0) return 0;
    const r = annualRatePct / 100 / 12;
    const n = years * 12;
    return monthly * (1 - Math.pow(1 + r, -n)) / r;
  }

  function readDeposit() {
    return Math.max(0, Number(String(el.deposit.value).replace(/[^0-9.]/g, '')) || 0);
  }

  function model(overrides = {}) {
    const o = Object.assign({
      household: el.household.value,
      dependants: Number(el.dependants.value),
      partner: el.household.value === 'couple' ? Number(el.partnerIncome.value) : 0,
      cc: Number(el.cc.value),
      otherDebt: Number(el.otherDebt.value),
      hecs: Number(el.hecs.value),
      purpose: el.purpose.value,
      years: Number(el.term.value),
      deposit: readDeposit(),
      keptIds: kept,
      rateAdj: 0
    }, overrides);

    const income = INCOME.salary + INCOME.interestGross * INCOME.interestShading + o.partner;

    const observed = SPEND.reduce((sum, s) => sum + (o.keptIds.has(s.id) ? s.amount : 0), 0);
    const essentialOnly = SPEND.reduce((sum, s) => sum + (s.essential ? s.amount : 0), 0);
    const floor = (o.household === 'couple' ? HEM.couple : HEM.single) + o.dependants * HEM.perDependant;
    const assessed = Math.max(observed, floor);

    const commitments = o.cc * CC_ASSESS_RATE + o.otherDebt + o.hecs;
    const surplus = Math.max(0, income - assessed - commitments);

    const productRate = RATES[o.purpose] + o.rateAdj;
    const assessRate = productRate + BUFFER;

    const capacity = loanFor(surplus, assessRate, o.years);

    // A loan is also capped by the deposit: we won't go past 95% LVR.
    const priceByDeposit = o.deposit > 0 ? o.deposit / (1 - MAX_LVR) : 0;
    const priceByCapacity = capacity + o.deposit;
    const price = o.deposit > 0 ? Math.min(priceByDeposit, priceByCapacity) : priceByCapacity;
    const loan = Math.max(0, price - o.deposit);
    const lvr = price > 0 ? (loan / price) * 100 : 0;

    return {
      income, observed, essentialOnly, floor, assessed, commitments, surplus,
      productRate, assessRate, capacity, loan, price, lvr,
      lmi: finance.lmi(loan, lvr),
      repayment: finance.repayment(loan, productRate, o.years),
      depositBinds: o.deposit > 0 && priceByDeposit < priceByCapacity
    };
  }

  /* ------------------------------------------------------------- render -- */

  function renderLedger() {
    el.ledger.innerHTML = '';
    SPEND.forEach((s) => {
      const on = kept.has(s.id);
      const row = document.createElement(s.essential ? 'div' : 'label');
      row.className = 'ledger-row';
      if (!s.essential) row.style.cursor = 'pointer';

      const ico = document.createElement('div');
      ico.className = 'ledger-ico';
      ico.style.background = s.colour;
      if (s.essential) {
        ico.textContent = s.name.charAt(0);
      } else {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = on;
        cb.setAttribute('aria-label', `Count ${s.name} in the assessment`);
        cb.addEventListener('change', () => {
          if (cb.checked) kept.add(s.id); else kept.delete(s.id);
          renderLedger();
          render();
        });
        ico.style.background = 'transparent';
        ico.appendChild(cb);
      }

      const mid = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'ledger-name';
      name.textContent = s.name;
      if (!on) name.style.opacity = '.45';
      const cat = document.createElement('div');
      cat.className = 'ledger-cat';
      cat.textContent = s.essential ? `${s.detail} · essential` : on ? s.detail : 'Excluded by you';
      mid.append(name, cat);

      const amt = document.createElement('div');
      amt.className = 'ledger-amt';
      amt.textContent = fmt.money(s.amount);
      if (!on) { amt.style.textDecoration = 'line-through'; amt.style.opacity = '.45'; }

      row.append(ico, mid, amt);
      el.ledger.appendChild(row);
    });
  }

  function renderChart(m) {
    const w = 320, h = 22, y = 12, r = 11;
    const total = Math.max(1, m.income);
    const segs = [
      { v: m.assessed, c: '#9eb5be' },
      { v: m.commitments, c: '#ff911e' },
      { v: m.surplus, c: '#b1ef42' }
    ];
    let x = 0;
    let svg = `<rect x="0" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#ffffff1f"/>`;
    svg += `<clipPath id="cl"><rect x="0" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath><g clip-path="url(#cl)">`;
    segs.forEach((s) => {
      const sw = (s.v / total) * w;
      svg += `<rect x="${x.toFixed(2)}" y="${y}" width="${Math.max(0, sw).toFixed(2)}" height="${h}" fill="${s.c}"/>`;
      x += sw;
    });
    svg += '</g>';
    const pct = Math.round((m.surplus / total) * 100);
    svg += `<text x="${w}" y="8" text-anchor="end" font-size="10" fill="#ffffff87">${pct}% of income is available for repayments</text>`;
    el.chart.innerHTML = svg;
  }

  function renderLevers(m) {
    const base = m.loan;
    const candidates = [];

    if (Number(el.cc.value) > 0) {
      candidates.push({
        title: 'Close the credit cards',
        body: `Your ${fmt.money(Number(el.cc.value))} of limits is assessed at ${fmt.money(Number(el.cc.value) * CC_ASSESS_RATE)} a month whether you owe anything or not.`,
        gain: model({ cc: 0 }).loan - base
      });
    }
    if (Number(el.otherDebt.value) > 0) {
      candidates.push({
        title: 'Clear the other loan repayments',
        body: `${fmt.money(Number(el.otherDebt.value))} a month of car, personal or BNPL commitments comes straight off your capacity.`,
        gain: model({ otherDebt: 0 }).loan - base
      });
    }
    if (Number(el.term.value) < 30) {
      candidates.push({
        title: 'Stretch the term to 30 years',
        body: 'Lower minimum repayments lift what you can service — you pay more interest over the life of the loan, so weigh it up.',
        gain: model({ years: 30 }).loan - base
      });
    }
    if (m.observed > m.floor) {
      const floorIds = new Set(SPEND.filter((s) => s.essential).map((s) => s.id));
      candidates.push({
        title: 'Trim the discretionary spend',
        body: `You're assessed at your actual ${fmt.money(m.observed)}, above the ${fmt.money(m.floor)} benchmark. Cutting back counts — but only down to that floor.`,
        gain: model({ keptIds: floorIds }).loan - base
      });
    }
    if (el.household.value === 'couple' && Number(el.partnerIncome.value) === 0) {
      candidates.push({
        title: 'Add the second income',
        body: 'You’ve told us there are two applicants but no second income. Adding it is by far the biggest lever here.',
        gain: model({ partner: 5000 }).loan - base
      });
    }
    if (m.depositBinds) {
      candidates.push({
        title: 'Save a larger deposit',
        body: 'Your deposit is the constraint right now, not your income — you can service more than 95% LVR lets you borrow.',
        gain: model({ deposit: readDeposit() * 1.5 }).loan - base
      });
    }
    candidates.push({
      title: 'Wait for a rate cut',
      body: 'A 0.25% fall in the variable rate lowers the buffered assessment rate too. Worth knowing, not worth waiting for.',
      gain: model({ rateAdj: -0.25 }).loan - base
    });
    if (m.lvr > 80) {
      candidates.push({
        title: 'Get to a 20% deposit',
        body: `At ${m.lvr.toFixed(1)}% LVR you'd pay around ${fmt.money(m.lmi)} in LMI. That's money for the lender's insurer, not your house.`,
        gain: 0,
        note: `Saves ${fmt.money(m.lmi)} upfront`
      });
    }

    const top = candidates
      .filter((c) => c.gain > 1000 || c.note)
      .sort((a, b) => (b.gain || 0) - (a.gain || 0))
      .slice(0, 3);

    el.levers.innerHTML = '';
    if (!top.length) {
      el.levers.innerHTML = '<p class="muted" style="grid-column:1/-1;margin:0">Nothing obvious left to pull — your commitments are clear and you\'re assessed at the benchmark floor. From here it\'s income or deposit.</p>';
      return;
    }
    top.forEach((c) => {
      const card = document.createElement('article');
      card.className = 'card card--ink';
      card.style.border = '1px solid var(--divider-on-inverse)';
      card.innerHTML = `
        <div class="bignum bignum--lime" style="font-size:2rem">${c.note ? c.note : '+' + fmt.money(c.gain)}</div>
        <h5 style="margin-top:.5rem">${c.title}</h5>
        <p class="muted small mb-0">${c.body}</p>`;
      el.levers.appendChild(card);
    });
  }

  function render() {
    const m = model();
    const roundDown = (n) => Math.floor(n / 1000) * 1000;

    el.incomeTotal.textContent = fmt.money(INCOME.salary + INCOME.interestGross * INCOME.interestShading);
    el.observed.textContent = fmt.money(m.observed);
    el.hem.textContent = fmt.money(m.floor);
    el.assessed.textContent = fmt.money(m.assessed);

    el.hemNote.textContent = m.observed >= m.floor
      ? `You spend more than the ${fmt.money(m.floor)} benchmark for your household, so we assess your actual spending. Trimming it does lift your estimate — down to that floor, and no further.`
      : `You spend less than the ${fmt.money(m.floor)} benchmark for your household, so that floor is what we assess. Cutting back further won't lift your estimate, and we'd rather tell you than let you chase it.`;

    animateNumber(el.bpMain, roundDown(m.loan), fmt.money);
    el.bpRange.textContent = `Range ${fmt.money(roundDown(m.loan * (1 - RANGE_SPREAD)))} – ${fmt.money(roundDown(m.loan * (1 + RANGE_SPREAD)))}`;
    el.bpAssess.textContent = `Assessed at ${m.assessRate.toFixed(2)}% p.a. — the ${m.productRate.toFixed(2)}% product rate plus a ${BUFFER.toFixed(2)}% buffer`;
    el.bpMeter.style.width = `${Math.max(4, Math.min(100, (m.surplus / m.income) * 100)).toFixed(1)}%`;

    renderChart(m);

    el.rIncome.textContent = fmt.money(m.income);
    el.rExpenses.textContent = `−${fmt.money(m.assessed)}`;
    el.rCommit.textContent = `−${fmt.money(m.commitments)}`;
    el.rSurplus.textContent = fmt.money(m.surplus);

    el.rPrice.textContent = fmt.money(roundDown(m.price));
    el.rDeposit.textContent = fmt.money(readDeposit());
    el.rLvr.textContent = m.price > 0 ? `${m.lvr.toFixed(1)}%` : '—';
    el.rLmi.textContent = m.lmi > 0 ? fmt.money(m.lmi) : 'None — you’re at or under 80%';
    el.rRepay.textContent = `${fmt.money(m.repayment)} / mo`;

    renderLevers(m);
  }

  /* ------------------------------------------------------------ wiring -- */

  function bindRange(input, output, format) {
    const sync = () => { output.textContent = format(Number(input.value)); render(); };
    input.addEventListener('input', sync);
    output.textContent = format(Number(input.value));
  }

  bindRange(el.cc, el.ccOut, fmt.money);
  bindRange(el.otherDebt, el.otherDebtOut, (n) => `${fmt.money(n)}/mo`);
  bindRange(el.hecs, el.hecsOut, (n) => `${fmt.money(n)}/mo`);
  bindRange(el.partnerIncome, el.partnerOut, (n) => `${fmt.money(n)}/mo`);

  el.household.addEventListener('change', () => {
    el.partnerField.hidden = el.household.value !== 'couple';
    render();
  });
  [el.dependants, el.purpose, el.term].forEach((c) => c.addEventListener('change', render));

  el.deposit.addEventListener('input', render);
  el.deposit.addEventListener('blur', () => {
    el.deposit.value = fmt.num(readDeposit());
    render();
  });

  /* -------------------------------------------------------------- scan -- */

  const SCAN_STEPS = [
    'Reading transactions…',
    'Matching salary credits…',
    'Categorising spend…',
    'Excluding one-offs…',
    'Applying the benchmark…',
    'Done'
  ];

  function runScan() {
    el.scanBtn.disabled = true;
    el.scanBtn.setAttribute('aria-disabled', 'true');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduce ? 0 : 1800;
    const ticks = [...document.querySelectorAll('[data-scantick]')];
    const t0 = performance.now();

    function finish() {
      el.scanMeter.style.width = '100%';
      el.scanStatus.textContent = 'Read';
      el.scanNote.textContent = 'Read complete. 737 transactions across three accounts, 12 months to today.';
      ticks.forEach((t) => { t.textContent = '✓'; t.style.color = 'var(--positive)'; });
      el.readDate.textContent = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
      el.zone.hidden = false;
      renderLedger();
      render();
      // Retarget the label span — writing to the button would drop its badge.
      el.scanBtnLabel.textContent = 'Re-read my accounts';
      el.scanBtn.disabled = false;
      el.scanBtn.removeAttribute('aria-disabled');
      el.zone.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }

    if (reduce) { finish(); return; }

    function frame(t) {
      const p = Math.min(1, (t - t0) / duration);
      el.scanMeter.style.width = `${(p * 100).toFixed(1)}%`;
      el.scanStatus.textContent = SCAN_STEPS[Math.min(SCAN_STEPS.length - 1, Math.floor(p * SCAN_STEPS.length))];
      ticks.forEach((tick, i) => { if (p > (i + 1) / (ticks.length + 1)) { tick.textContent = '✓'; tick.style.color = 'var(--positive)'; } });
      if (p < 1) requestAnimationFrame(frame); else finish();
    }
    requestAnimationFrame(frame);
  }

  el.scanBtn.addEventListener('click', runScan);

  // Pre-render so the workspace is correct the instant it is revealed.
  renderLedger();
  render();
})();
