/* Bankwest home — Repayment Boosters simulator
   Models a 100% offset properly: the contracted repayment never changes, but
   interest is charged on (balance − offset), so a growing offset clears the
   loan early without a single extra repayment. */

(function () {
  const { fmt, finance, animateNumber } = window.bw;

  const MAX_MONTHS = 600;

  const $ = (id) => document.getElementById(id);
  const el = {
    loan: $('loan'), loanOut: $('loan-out'),
    rate: $('rate'), rateOut: $('rate-out'),
    term: $('term'), offsetStart: $('offset-start'),
    roundups: $('roundups'),
    split: $('split'), splitOut: $('split-out'),
    ratekeeper: $('ratekeeper'), rkField: $('rk-field'),
    rkCut: $('rk-cut'), rkCutOut: $('rk-cut-out'),

    saved: $('b-saved'), time: $('b-time'), meter: $('b-meter'), meterNote: $('b-meter-note'),
    repay: $('b-repay'), flow: $('b-flow'),
    intBase: $('b-int-base'), intBoost: $('b-int-boost'),
    payoff: $('b-payoff'), offsetEnd: $('b-offset-end'),
    chart: $('boost-chart'), chartNote: $('chart-note')
  };

  const readOffset = () => Math.max(0, Number(String(el.offsetStart.value).replace(/[^0-9.]/g, '')) || 0);

  /**
   * Amortise with a per-month offset contribution supplied by a callback, so
   * Rate Keeper can start contributing partway through.
   */
  function simulate({ principal, ratePct, years, offsetStart, flowAt }) {
    const r = ratePct / 100 / 12;
    const pay = finance.repayment(principal, ratePct, years);
    let bal = principal, offset = offsetStart, interest = 0, m = 0;
    const series = [{ m: 0, bal, offset }];

    while (bal > 0.5 && m < MAX_MONTHS) {
      const chargeable = Math.max(0, bal - offset);
      const i = chargeable * r;
      interest += i;
      bal = bal + i - pay;
      offset += flowAt(m);
      m++;
      series.push({ m, bal: Math.max(0, bal), offset });
      if (bal <= 0) break;
    }
    return { interest, months: m, series, endOffset: offset, repayment: pay };
  }

  /** Extra monthly amount Rate Keeper generates once the assumed cuts land. */
  function rateKeeperFlow(principal, ratePct, years, cutPct) {
    if (!el.ratekeeper.checked || cutPct <= 0) return () => 0;
    const base = finance.repayment(principal, ratePct, years);
    const step1 = base - finance.repayment(principal, ratePct - cutPct / 2, years);
    const step2 = base - finance.repayment(principal, ratePct - cutPct, years);
    return (m) => (m >= 24 ? step2 : m >= 12 ? step1 : 0);
  }

  function render() {
    const principal = Number(el.loan.value);
    const ratePct = Number(el.rate.value);
    const years = Number(el.term.value);
    const offsetStart = readOffset();
    const roundups = Number(el.roundups.value);
    const split = Number(el.split.value);
    const cut = Number(el.rkCut.value);

    el.loanOut.textContent = fmt.money(principal);
    el.rateOut.textContent = `${ratePct.toFixed(2)}%`;
    el.splitOut.textContent = `${fmt.money(split)}/mo`;
    el.rkCutOut.textContent = `${cut.toFixed(2)}%`;
    el.rkField.hidden = !el.ratekeeper.checked;

    const rk = rateKeeperFlow(principal, ratePct, years, cut);
    const flowAt = (m) => roundups + split + rk(m);

    const base = simulate({ principal, ratePct, years, offsetStart, flowAt: () => 0 });
    const boost = simulate({ principal, ratePct, years, offsetStart, flowAt });

    const savedInterest = base.interest - boost.interest;
    const savedMonths = base.months - boost.months;
    const steady = flowAt(24);

    animateNumber(el.saved, savedInterest, fmt.money);
    el.time.textContent = savedMonths > 0
      ? `Loan clears ${fmt.months(savedMonths)} early`
      : 'Switch a booster on to bring the payoff date forward';

    const share = base.interest > 0 ? (savedInterest / base.interest) * 100 : 0;
    el.meter.style.width = `${Math.max(1, Math.min(100, share)).toFixed(1)}%`;
    el.meterNote.textContent = `${share.toFixed(0)}% of your interest bill removed`;

    el.repay.textContent = `${fmt.money(base.repayment)} / mo`;
    el.flow.textContent = steady > 0
      ? `${fmt.money(steady)}${el.ratekeeper.checked && cut > 0 ? ' once Rate Keeper is running' : ''}`
      : 'Nothing yet';
    el.intBase.textContent = fmt.money(base.interest);
    el.intBoost.textContent = fmt.money(boost.interest);
    el.payoff.textContent = fmt.dateIn(boost.months);
    el.offsetEnd.textContent = fmt.money(boost.endOffset);

    renderChart(base, boost);
  }

  function renderChart(base, boost) {
    const W = 720, H = 300, PL = 68, PR = 16, PT = 16, PB = 34;
    const w = W - PL - PR, h = H - PT - PB;

    const visible = Math.max(base.months, boost.months);
    const yMax = Math.max(
      base.series[0].bal,
      ...boost.series.map((d) => d.offset)
    ) * 1.06;

    const x = (m) => PL + (m / visible) * w;
    const y = (v) => PT + h - (v / yMax) * h;
    const line = (series, key) => series
      .filter((_, i) => i % Math.max(1, Math.floor(series.length / 240)) === 0 || i === series.length - 1)
      .map((d, i) => `${i ? 'L' : 'M'}${x(d.m).toFixed(1)},${y(d[key]).toFixed(1)}`).join('');

    let svg = '';

    for (let i = 0; i <= 4; i++) {
      const v = (yMax / 4) * i;
      const gy = y(v);
      svg += `<line x1="${PL}" y1="${gy.toFixed(1)}" x2="${W - PR}" y2="${gy.toFixed(1)}" stroke="#0000001a" stroke-width="1"/>`;
      svg += `<text x="${PL - 10}" y="${(gy + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#1a1a1aa3">${fmt.money(v)}</text>`;
    }

    const totalYears = Math.ceil(visible / 12);
    const stepYears = totalYears > 20 ? 5 : totalYears > 10 ? 5 : 2;
    for (let yr = 0; yr <= totalYears; yr += stepYears) {
      const m = Math.min(visible, yr * 12);
      svg += `<text x="${x(m).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#1a1a1aa3">${yr === 0 ? 'Now' : 'Yr ' + yr}</text>`;
    }

    svg += `<path d="${line(base.series, 'bal')}" fill="none" stroke="#9eb5be" stroke-width="2.5" stroke-linejoin="round"/>`;
    svg += `<path d="${line(boost.series, 'offset')}" fill="none" stroke="#ff911e" stroke-width="2" stroke-dasharray="6 5" stroke-linejoin="round"/>`;
    svg += `<path d="${line(boost.series, 'bal')}" fill="none" stroke="#7fbf1f" stroke-width="2.8" stroke-linejoin="round"/>`;

    if (boost.months < base.months) {
      const bx = x(boost.months);
      svg += `<line x1="${bx.toFixed(1)}" y1="${PT}" x2="${bx.toFixed(1)}" y2="${(PT + h).toFixed(1)}" stroke="#1a1a1a" stroke-width="1" stroke-dasharray="3 4"/>`;
      svg += `<circle cx="${bx.toFixed(1)}" cy="${y(0).toFixed(1)}" r="5" fill="#1a1a1a"/>`;
      const anchor = boost.months / visible > 0.75 ? 'end' : 'start';
      svg += `<text x="${(bx + (anchor === 'end' ? -10 : 10)).toFixed(1)}" y="${(PT + 16).toFixed(1)}" text-anchor="${anchor}" font-size="12" font-weight="600" fill="#1a1a1a">Paid off ${fmt.months(base.months - boost.months)} early</text>`;
    }

    el.chart.innerHTML = svg;
    el.chartNote.textContent = `${fmt.months(base.months)} without Boosters · ${fmt.months(boost.months)} with them`;
  }

  [el.loan, el.rate, el.split, el.rkCut].forEach((r) => r.addEventListener('input', render));
  [el.term, el.roundups, el.ratekeeper].forEach((c) => c.addEventListener('change', render));
  el.offsetStart.addEventListener('input', render);
  el.offsetStart.addEventListener('blur', () => { el.offsetStart.value = fmt.num(readOffset()); render(); });

  render();
})();
