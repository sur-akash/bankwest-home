/* Bankwest home — Home Deposit Saver
   Projects the month a saver is actually able to settle, counting the whole
   upfront bill rather than the deposit alone, and letting the target move if
   the market does. */

(function () {
  const { fmt, finance, animateNumber } = window.bw;

  const LEGALS = 3300;   // conveyancing, searches, building & pest
  const MOVING = 1500;   // removalist, connections, settling in
  const LOAN_RATE = 6.24;
  const LOAN_YEARS = 30;
  const MAX_MONTHS = 600;

  const $ = (id) => document.getElementById(id);
  const el = {
    price: $('price'), priceOut: $('price-out'),
    fhb: $('fhb'), capitalise: $('capitalise'),
    savings: $('savings'),
    monthly: $('monthly'), monthlyOut: $('monthly-out'),
    boost: $('boost'),
    rate: $('rate'), rateOut: $('rate-out'),
    growth: $('growth'), growthOut: $('growth-out'),

    lblDeposit: $('lbl-deposit'), cDeposit: $('c-deposit'),
    lblDuty: $('lbl-duty'), cDuty: $('c-duty'),
    cLegals: $('c-legals'), cMoving: $('c-moving'),
    lblLmi: $('lbl-lmi'), cLmi: $('c-lmi'), cTotal: $('c-total'), cNote: $('c-note'),

    readyDate: $('ready-date'), readySub: $('ready-sub'),
    readyMeter: $('ready-meter'), readyPct: $('ready-pct'),
    rSaved: $('r-saved'), rTogo: $('r-togo'), rInterest: $('r-interest'),
    rLoan: $('r-loan'), rRepay: $('r-repay'),

    chart: $('saver-chart'), chartNote: $('chart-note'),
    ladder: $('ladder')
  };

  const readSavings = () => Math.max(0, Number(String(el.savings.value).replace(/[^0-9.]/g, '')) || 0);
  const depositPct = () => Number(document.querySelector('input[name="deposit-pct"]:checked').value);

  /* -------------------------------------------------------------- model -- */

  /** Everything you must have in the account on settlement day, at a price. */
  function upfrontAt(price, pct, fhb, capitaliseLmi) {
    const deposit = price * pct;
    const duty = finance.stampDuty(price, fhb);
    const loan = price - deposit;
    const lmi = finance.lmi(loan, (1 - pct) * 100);
    return {
      deposit, duty, legals: LEGALS, moving: MOVING, lmi, loan,
      total: deposit + duty + LEGALS + MOVING + (capitaliseLmi ? 0 : lmi)
    };
  }

  function project(opts) {
    const { price, pct, fhb, capitaliseLmi, savings, monthly, ratePct, growthPct } = opts;
    const r = ratePct / 100 / 12;
    const g = Math.pow(1 + growthPct / 100, 1 / 12) - 1;

    let bal = savings, interest = 0, m = 0;
    const series = [];
    const targetAt = (month) => upfrontAt(price * Math.pow(1 + g, month), pct, fhb, capitaliseLmi).total;

    let target = targetAt(0);
    series.push({ m: 0, bal, contributed: savings, target });

    while (bal < target && m < MAX_MONTHS) {
      const i = bal * r;
      interest += i;
      bal += i + monthly;
      m++;
      target = targetAt(m);
      series.push({ m, bal, contributed: savings + monthly * m, target });
    }

    const reached = bal >= target;

    // Carry the curve a little past the crossing so the marker isn't jammed
    // against the right edge of the chart.
    if (reached) {
      const tail = Math.max(3, Math.round(m * 0.15));
      let tb = bal;
      for (let k = 1; k <= tail; k++) {
        tb += tb * r + monthly;
        series.push({ m: m + k, bal: tb, contributed: savings + monthly * (m + k), target: targetAt(m + k) });
      }
    }
    return {
      months: reached ? m : Infinity,
      reached, series, interest,
      endBalance: bal,
      target: targetAt(reached ? m : 0),
      priceAtSettle: price * Math.pow(1 + g, reached ? m : 0)
    };
  }

  function currentOpts(overrides = {}) {
    return Object.assign({
      price: Number(el.price.value),
      pct: depositPct(),
      fhb: el.fhb.checked,
      capitaliseLmi: el.capitalise.checked,
      savings: readSavings(),
      monthly: Number(el.monthly.value) + Number(el.boost.value),
      ratePct: Number(el.rate.value),
      growthPct: Number(el.growth.value)
    }, overrides);
  }

  /* -------------------------------------------------------------- chart -- */

  function renderChart(p, opts) {
    const W = 720, H = 300, PL = 68, PR = 16, PT = 16, PB = 34;
    const w = W - PL - PR, h = H - PT - PB;

    const visible = p.reached
      ? Math.max(6, p.series[p.series.length - 1].m)
      : Math.min(MAX_MONTHS, 120);
    const pts = p.series.slice(0, visible + 1);
    if (pts.length < 2) { el.chart.innerHTML = ''; return; }

    const yMax = Math.max(...pts.map((d) => Math.max(d.bal, d.target))) * 1.08;
    const x = (m) => PL + (m / visible) * w;
    const y = (v) => PT + h - (v / yMax) * h;

    const path = (key) => pts.map((d, i) => `${i ? 'L' : 'M'}${x(d.m).toFixed(1)},${y(d[key]).toFixed(1)}`).join('');

    let svg = '';

    // gridlines
    for (let i = 0; i <= 4; i++) {
      const v = (yMax / 4) * i;
      const gy = y(v);
      svg += `<line x1="${PL}" y1="${gy.toFixed(1)}" x2="${W - PR}" y2="${gy.toFixed(1)}" stroke="#0000001a" stroke-width="1"/>`;
      svg += `<text x="${PL - 10}" y="${(gy + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#1a1a1aa3">${fmt.money(v)}</text>`;
    }

    // x labels, one per year
    const years = Math.max(1, Math.ceil(visible / 12));
    const stepYears = years > 10 ? 5 : years > 5 ? 2 : 1;
    for (let yr = 0; yr <= years; yr += stepYears) {
      const m = Math.min(visible, yr * 12);
      svg += `<text x="${x(m).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#1a1a1aa3">${yr === 0 ? 'Now' : fmt.dateIn(m)}</text>`;
    }

    // band between contributions-only and balance = interest earned
    const contribPath = path('contributed');
    const balPath = path('bal');
    const revContrib = pts.slice().reverse().map((d, i) => `${i ? 'L' : 'L'}${x(d.m).toFixed(1)},${y(d.contributed).toFixed(1)}`).join('');
    svg += `<path d="${balPath}${revContrib}Z" fill="#9eb5be" opacity=".35"/>`;

    // balance area + line
    svg += `<path d="${balPath}L${x(pts[pts.length - 1].m).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z" fill="#b1ef42" opacity=".22"/>`;
    svg += `<path d="${balPath}" fill="none" stroke="#7fbf1f" stroke-width="2.5" stroke-linejoin="round"/>`;

    // target line
    svg += `<path d="${path('target')}" fill="none" stroke="#ff911e" stroke-width="2.5" stroke-dasharray="6 5" stroke-linejoin="round"/>`;

    // crossing marker
    if (p.reached) {
      const cross = pts.find((d) => d.m === p.months) || pts[pts.length - 1];
      const cx = x(cross.m), cy = y(cross.bal);
      svg += `<line x1="${cx.toFixed(1)}" y1="${PT}" x2="${cx.toFixed(1)}" y2="${(PT + h).toFixed(1)}" stroke="#1a1a1a" stroke-width="1" stroke-dasharray="3 4"/>`;
      svg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="#1a1a1a"/>`;
      svg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="#b1ef42"/>`;
      const anchor = cross.m / visible > 0.7 ? 'end' : 'start';
      svg += `<text x="${(cx + (anchor === 'end' ? -12 : 12)).toFixed(1)}" y="${Math.max(PT + 14, cy - 14).toFixed(1)}" text-anchor="${anchor}" font-size="12" font-weight="600" fill="#1a1a1a">${fmt.dateIn(cross.m)}</text>`;
    }

    el.chart.innerHTML = svg;
    el.chartNote.textContent = p.reached
      ? `Balance crosses the target in ${fmt.months(p.months)}`
      : 'Your balance never catches the target at this rate';
  }

  /* ------------------------------------------------------------- ladder -- */

  function renderLadder(baseMonths) {
    const rows = [0.20, 0.15, 0.10, 0.05].map((pct) => {
      const opts = currentOpts({ pct });
      const p = project(opts);
      const cost = upfrontAt(p.priceAtSettle, pct, opts.fhb, opts.capitaliseLmi);
      const repay = finance.repayment(cost.loan, LOAN_RATE, LOAN_YEARS);
      return { pct, p, cost, repay };
    });

    el.ladder.innerHTML = '';
    rows.forEach(({ pct, p, cost, repay }) => {
      const selected = Math.abs(pct - depositPct()) < 1e-9;
      const tr = document.createElement('tr');
      if (selected) tr.style.background = '#b1ef4229';

      const sooner = Number.isFinite(p.months) && Number.isFinite(baseMonths)
        ? baseMonths - p.months : null;

      tr.innerHTML = `
        <th scope="row">${(pct * 100).toFixed(0)}%${selected ? ' <span class="tag">Your pick</span>' : ''}</th>
        <td>${fmt.money(p.target)}</td>
        <td>${cost.lmi > 0 ? fmt.money(cost.lmi) + '<span class="cell-note">' + (el.capitalise.checked ? 'added to the loan' : 'saved upfront') + '</span>' : '<span class="is-good">None</span>'}</td>
        <td class="is-good">${Number.isFinite(p.months) ? fmt.dateIn(p.months) : 'Not at this rate'}</td>
        <td>${sooner === null ? '—' : sooner > 0 ? fmt.months(sooner) + ' sooner' : sooner < 0 ? fmt.months(-sooner) + ' later' : '—'}</td>
        <td>${fmt.money(cost.loan)}</td>
        <td>${fmt.money(repay)}<span class="cell-note">per month</span></td>`;
      el.ladder.appendChild(tr);
    });
  }

  /* ------------------------------------------------------------- render -- */

  function render() {
    const opts = currentOpts();
    const p = project(opts);
    const cost = upfrontAt(p.priceAtSettle, opts.pct, opts.fhb, opts.capitaliseLmi);

    el.priceOut.textContent = fmt.money(opts.price);
    el.monthlyOut.textContent = fmt.money(Number(el.monthly.value));
    el.rateOut.textContent = `${Number(el.rate.value).toFixed(2)}%`;
    el.growthOut.textContent = `${Number(el.growth.value).toFixed(1)}% a year`;

    // upfront breakdown
    el.lblDeposit.textContent = `Deposit (${(opts.pct * 100).toFixed(0)}%)`;
    el.cDeposit.textContent = fmt.money(cost.deposit);
    el.lblDuty.textContent = opts.fhb ? 'Transfer duty (first home concession)' : 'Transfer duty';
    el.cDuty.textContent = cost.duty > 0 ? fmt.money(cost.duty) : '$0 — concession applies';
    el.cLegals.textContent = fmt.money(LEGALS);
    el.cMoving.textContent = fmt.money(MOVING);
    el.cLmi.textContent = cost.lmi === 0
      ? 'None at this deposit'
      : opts.capitaliseLmi ? `${fmt.money(cost.lmi)} — added to your loan` : fmt.money(cost.lmi);
    el.cTotal.textContent = fmt.money(p.target);

    el.cNote.textContent = cost.lmi > 0 && opts.capitaliseLmi
      ? `Capitalising the ${fmt.money(cost.lmi)} premium keeps it out of what you have to save, but you'll pay interest on it for the life of the loan.`
      : cost.lmi > 0
        ? `You've chosen to pay the ${fmt.money(cost.lmi)} premium upfront, so it's part of the total above.`
        : 'A 20% deposit clears the LMI threshold, so there’s no premium in this total.';

    // headline
    const togo = Math.max(0, p.target - opts.savings);
    const pctThere = p.target > 0 ? Math.min(100, (opts.savings / p.target) * 100) : 0;

    if (p.reached) {
      el.readyDate.textContent = p.months === 0 ? 'Now' : fmt.dateIn(p.months);
      el.readySub.textContent = p.months === 0
        ? `You already have the ${fmt.money(p.target)} you need`
        : `${fmt.months(p.months)} away · saving ${fmt.money(opts.monthly)} a month`;
    } else {
      el.readyDate.textContent = 'Not at this rate';
      el.readySub.textContent = opts.growthPct > 0
        ? `At ${opts.growthPct.toFixed(1)}% price growth the target is moving faster than you're saving. Try a smaller deposit, a lower price, or more each month.`
        : 'You’d need to put more away each month, or aim at a smaller deposit.';
    }

    el.readyMeter.style.width = `${pctThere.toFixed(1)}%`;
    el.readyPct.textContent = `${pctThere.toFixed(0)}% of the way there`;

    el.rSaved.textContent = fmt.money(opts.savings);
    el.rTogo.textContent = fmt.money(togo);
    el.rInterest.textContent = p.reached ? fmt.money(p.interest) : '—';
    el.rLoan.textContent = fmt.money(cost.loan);
    el.rRepay.textContent = `${fmt.money(finance.repayment(cost.loan, LOAN_RATE, LOAN_YEARS))} / mo`;

    renderChart(p, opts);
    renderLadder(p.months);
  }

  /* ------------------------------------------------------------- wiring -- */

  [el.price, el.monthly, el.rate, el.growth].forEach((r) => r.addEventListener('input', render));
  [el.fhb, el.capitalise, el.boost].forEach((c) => c.addEventListener('change', render));
  document.querySelectorAll('input[name="deposit-pct"]').forEach((r) => r.addEventListener('change', render));
  el.savings.addEventListener('input', render);
  el.savings.addEventListener('blur', () => { el.savings.value = fmt.num(readSavings()); render(); });

  render();
})();
