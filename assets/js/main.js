/* Bankwest home — shared behaviour + finance helpers */

/* ---------------------------------------------------------------- format */

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
const AUD2 = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat('en-AU');

const fmt = {
  money: (n) => AUD.format(Math.round(n || 0)),
  money2: (n) => AUD2.format(n || 0),
  num: (n) => NUM.format(Math.round(n || 0)),
  pct: (n, d = 2) => `${(n || 0).toFixed(d)}%`,
  /** 41 -> "3 years 5 months" */
  months: (m) => {
    m = Math.max(0, Math.round(m));
    const y = Math.floor(m / 12), r = m % 12;
    const parts = [];
    if (y) parts.push(`${y} year${y === 1 ? '' : 's'}`);
    if (r) parts.push(`${r} month${r === 1 ? '' : 's'}`);
    return parts.join(' ') || '0 months';
  },
  /** months from now -> "Mar 2028" */
  dateIn: (m) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + Math.round(m));
    return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
  }
};

/* --------------------------------------------------------------- finance */

const finance = {
  /** Monthly principal & interest repayment. */
  repayment(principal, annualRatePct, years) {
    const r = annualRatePct / 100 / 12;
    const n = years * 12;
    if (principal <= 0) return 0;
    if (r === 0) return principal / n;
    return (principal * r) / (1 - Math.pow(1 + r, -n));
  },

  /**
   * Amortise a loan month by month, optionally with an offset balance that
   * grows by `offsetMonthly` each month. Interest is charged on
   * (balance - offset), which is how a 100% offset actually behaves.
   * Returns total interest paid and the month the loan clears.
   */
  amortise({ principal, annualRatePct, years, repayment, offsetStart = 0, offsetMonthly = 0, extraMonthly = 0, maxMonths = 600 }) {
    const r = annualRatePct / 100 / 12;
    const pay = (repayment || this.repayment(principal, annualRatePct, years)) + extraMonthly;
    let bal = principal, offset = offsetStart, interest = 0, m = 0;
    const series = [];
    while (bal > 0.5 && m < maxMonths) {
      const chargeable = Math.max(0, bal - offset);
      const i = chargeable * r;
      interest += i;
      bal = bal + i - pay;
      offset += offsetMonthly;
      m++;
      if (m % 12 === 0 || bal <= 0) series.push({ month: m, balance: Math.max(0, bal), offset, interest });
      if (bal <= 0) break;
    }
    return { totalInterest: interest, months: m, series };
  },

  /**
   * Future value of a savings plan with monthly deposits and monthly
   * compounding — used by the Deposit Saver projection.
   */
  savingsMonths({ target, start = 0, monthly, annualRatePct = 0, boostMonthly = 0, maxMonths = 600 }) {
    const r = annualRatePct / 100 / 12;
    let bal = start, m = 0;
    const series = [{ month: 0, balance: bal }];
    if (monthly + boostMonthly <= 0 && bal < target) return { months: Infinity, series, interest: 0 };
    let interest = 0;
    while (bal < target && m < maxMonths) {
      const i = bal * r;
      interest += i;
      bal += i + monthly + boostMonthly;
      m++;
      series.push({ month: m, balance: bal });
    }
    return { months: m >= maxMonths && bal < target ? Infinity : m, series, interest, endBalance: bal };
  },

  /** Rough NSW-style transfer duty — illustrative only. */
  stampDuty(price, firstHomeBuyer) {
    if (firstHomeBuyer && price <= 800000) return 0;
    if (firstHomeBuyer && price <= 1000000) {
      const full = this.stampDuty(price, false);
      return full * ((price - 800000) / 200000);
    }
    const bands = [
      [16000, 0, 0.0125], [35000, 200, 0.015], [93000, 485, 0.0175],
      [351000, 1500, 0.035], [1168000, 10530, 0.045], [Infinity, 47295, 0.055]
    ];
    let prev = 0;
    for (const [cap, base, rate] of bands) {
      if (price <= cap) return base + (price - prev) * rate;
      prev = cap;
    }
    return 0;
  },

  /** Illustrative LMI premium as a % of the loan, by LVR band. */
  lmi(loan, lvr) {
    if (lvr <= 80) return 0;
    const rate = lvr <= 85 ? 0.010 : lvr <= 90 ? 0.020 : lvr <= 95 ? 0.036 : 0.045;
    return loan * rate;
  }
};

/* ------------------------------------------------------------ components */

function initNav() {
  document.querySelectorAll('[data-nav-toggle]').forEach((btn) => {
    const menu = document.getElementById(btn.getAttribute('aria-controls'));
    if (!menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = btn.getAttribute('aria-expanded') === 'true';
      closeAllMenus();
      btn.setAttribute('aria-expanded', String(!open));
      menu.dataset.open = String(!open);
    });
  });

  function closeAllMenus() {
    document.querySelectorAll('[data-nav-toggle]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('.nav-menu').forEach((m) => (m.dataset.open = 'false'));
  }
  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllMenus(); });

  const burger = document.querySelector('[data-burger]');
  const mobile = document.getElementById('mobile-nav');
  if (burger && mobile) {
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = mobile.dataset.open === 'true';
      mobile.dataset.open = String(!open);
      burger.setAttribute('aria-expanded', String(!open));
    });
  }
}

function initTabs(root = document) {
  root.querySelectorAll('[data-tabs]').forEach((group) => {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => select(idx));
      tab.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = (idx + dir + tabs.length) % tabs.length;
        tabs[next].focus();
        select(next);
      });
    });
    function select(idx) {
      tabs.forEach((t, i) => {
        const on = i === idx;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      group.dispatchEvent(new CustomEvent('tabchange', { detail: { index: idx, id: tabs[idx].id } }));
    }
  });
}

function initAccordions(root = document) {
  root.querySelectorAll('.acc-trigger').forEach((trigger) => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;
    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
  });
}

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach((e) => io.observe(e));
}

/** Animates a number to a new value; respects reduced-motion. */
function animateNumber(el, to, format = fmt.money, ms = 480) {
  const from = Number(el.dataset.val || 0);
  el.dataset.val = String(to);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
    el.textContent = format(to);
    return;
  }
  const t0 = performance.now();
  function frame(t) {
    const p = Math.min(1, (t - t0) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = format(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // rAF is throttled in background tabs, so guarantee the final value lands.
  setTimeout(() => { if (el.dataset.val === String(to)) el.textContent = format(to); }, ms + 120);
}

/** Two-way bind a range input and a text input holding the same value. */
function linkRangeAndInput(range, input, onChange) {
  const push = (v) => {
    const n = Math.max(Number(range.min), Math.min(Number(range.max), Number(v) || 0));
    range.value = String(n);
    if (input) input.value = fmt.num(n);
    onChange(n);
  };
  range.addEventListener('input', () => push(range.value));
  if (input) {
    input.addEventListener('input', () => {
      const raw = Number(String(input.value).replace(/[^0-9.]/g, ''));
      const n = Math.max(Number(range.min), Math.min(Number(range.max), raw || 0));
      range.value = String(n);
      onChange(n);
    });
    input.addEventListener('blur', () => push(range.value));
  }
  return push;
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initTabs();
  initAccordions();
  initReveal();
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
});

window.bw = { fmt, finance, animateNumber, linkRangeAndInput, initTabs, initAccordions };
