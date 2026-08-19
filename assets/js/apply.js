/* Bankwest home — application path
   Two things happening here: a triage that routes honestly between the online
   and specialist paths, and a six-step self-serve application whose fifth step
   is the account auto-linking consent screen. */

(function () {
  const { fmt, finance } = window.bw;
  const $ = (id) => document.getElementById(id);

  /* -------------------------------------------------------------- triage */

  // Conditions that genuinely need a person, and why.
  const REFERRALS = {
    purpose: {
      build:  'Construction lending draws down in stages against a fixed-price contract. A specialist sets that schedule up with you.',
      bridge: 'Bridging means holding two loans at once. Peak debt and end debt need working through before you commit.'
    },
    income: {
      self:     'Self-employed income is assessed from tax returns and financials, not payslips. A specialist will get more out of your position than a form will.',
      contract: 'Contract income depends on the length and history of your contracts, which needs a look rather than a checkbox.'
    },
    property: {
      land:     'Vacant land and construction security is valued in stages. That’s a specialist job.',
      unusual:  'Rural, commercial-zoned and unusual security needs a full valuation and a policy read.',
      offplan:  'Off-the-plan settlement dates move, and approvals expire. A specialist keeps the two in sync.'
    },
    structure: {
      trust:     'Trust and company borrowers need the deed and structure reviewed before assessment.',
      smsf:      'SMSF lending is a specialist product with its own rules.',
      guarantor: 'A guarantor needs their own advice and their own paperwork, and we won’t rush that through a web form.'
    }
  };

  const CAUTIONS = {
    income:   { 'payg-var': 'Bonus and commission income is shaded in the assessment, so your estimate may land lower than you expect.' },
    property: { regional: 'Regional properties sometimes need a full valuation rather than an automated one, which adds a few days.' },
    purpose:  { invest: 'Investment lending is fine online, but if this security is cross-collateralised with another loan we’ll move you across.' }
  };

  const tri = {
    purpose: $('t-purpose'), income: $('t-income'), property: $('t-property'), structure: $('t-structure'),
    title: $('path-title'), why: $('path-why'), time: $('path-time'),
    val: $('path-val'), sign: $('path-sign'), flags: $('path-flags'), cta: $('path-cta')
  };

  function renderTriage() {
    const picks = {
      purpose: tri.purpose.value, income: tri.income.value,
      property: tri.property.value, structure: tri.structure.value
    };

    const referrals = Object.entries(picks)
      .map(([k, v]) => REFERRALS[k] && REFERRALS[k][v])
      .filter(Boolean);
    const cautions = Object.entries(picks)
      .map(([k, v]) => CAUTIONS[k] && CAUTIONS[k][v])
      .filter(Boolean);

    const online = referrals.length === 0;

    tri.title.textContent = online ? 'Apply online' : 'Talk to a specialist';
    tri.why.textContent = online
      ? picks.purpose === 'refi'
        ? 'A salaried refinance on an established property is the cleanest case there is. You’d spend longer waiting for a call than completing this.'
        : 'Nothing here needs a person. The online path will be faster than booking a call, at the same rate.'
      : 'This one has moving parts that a web form handles badly. Same rate, same product — you just get someone on it.';

    tri.time.textContent = online ? 'About 12 minutes' : 'A 30-minute call, then we do the rest';
    tri.val.textContent = ['land', 'unusual', 'regional', 'offplan'].includes(picks.property)
      ? 'Full valuation likely' : 'Automated, instant';
    tri.sign.textContent = picks.structure === 'individual' ? 'Digital' : 'Digital, with some documents in person';

    tri.flags.innerHTML = '';
    const flagList = referrals.length ? referrals : cautions;
    if (flagList.length) {
      const h = document.createElement('p');
      h.className = 'tiny muted';
      h.style.marginBottom = '.5rem';
      h.textContent = referrals.length ? 'Why:' : 'Worth knowing:';
      tri.flags.appendChild(h);
      flagList.forEach((text) => {
        const p = document.createElement('p');
        p.className = 'small';
        p.style.cssText = 'margin:0 0 .75rem;padding-left:.875rem;border-left:2px solid ' + (referrals.length ? '#ff911e' : '#b1ef42');
        p.textContent = text;
        tri.flags.appendChild(p);
      });
    }

    tri.cta.textContent = online ? 'Start the online application' : 'Book a call with a specialist';
    tri.cta.setAttribute('href', online ? '#application' : '#specialist');
    tri.cta.className = online ? 'btn btn--lime btn--block' : 'btn btn--orange btn--block';
  }

  [tri.purpose, tri.income, tri.property, tri.structure].forEach((s) => s.addEventListener('change', renderTriage));
  renderTriage();

  /* ------------------------------------------------------------ linking */

  const linkTotal = $('link-total');
  const linkSaving = $('link-saving');

  function renderLinking() {
    const total = [...document.querySelectorAll('.link-acct')]
      .filter((c) => c.checked)
      .reduce((sum, c) => sum + Number(c.dataset.amount), 0);
    linkTotal.textContent = fmt.money(total);
    linkSaving.textContent = fmt.money(total * 0.0624); // a year of interest at the variable rate
    return total;
  }
  document.querySelectorAll('.link-acct').forEach((c) => c.addEventListener('change', renderLinking));
  renderLinking();

  /* ------------------------------------------------------------- wizard */

  const STEPS = [
    { title: 'Confirm it\'s you', sub: 'You\'re already signed in, so this part is a formality.' },
    { title: 'Your numbers', sub: 'Most of this came from Home Zone. Check it rather than type it.' },
    { title: 'The property', sub: 'An address is enough to get a valuation started.' },
    { title: 'Your loan', sub: 'Product, offset and the boosters you want running from day one.' },
    { title: 'Accounts we\'ll link', sub: 'The bit that usually takes a separate application. Not here.' },
    { title: 'Check and submit', sub: 'Nothing has been submitted yet, and no credit check has run.' },
    { title: 'Submitted', sub: 'Here\'s what happens next.' }
  ];

  const panels = [...document.querySelectorAll('[data-step]')];
  const dots = [...document.querySelectorAll('[data-step-dot]')];
  const nav = $('wizard-nav');
  const back = $('back'), next = $('next'), nextLabel = $('next-label');
  const stepTitle = $('step-title'), stepSub = $('step-sub'), stepCount = $('step-count');
  let step = 0;

  const num = (id) => Number(String($(id).value).replace(/[^0-9.]/g, '')) || 0;

  function renderProperty() {
    const price = num('a-price');
    const deposit = num('a-deposit');
    const loan = Math.max(0, price - deposit);
    const lvr = price > 0 ? (loan / price) * 100 : 0;
    $('a-avm').textContent = fmt.money(price * 1.0063); // the AVM rarely matches the contract exactly
    $('a-loan').textContent = fmt.money(loan);
    $('a-lvr').textContent = `${lvr.toFixed(1)}% — ${lvr > 80 ? 'LMI applies' : 'no LMI'}`;
    return { price, deposit, loan, lvr };
  }
  ['a-price', 'a-deposit'].forEach((id) => $(id).addEventListener('input', renderProperty));

  function renderReview() {
    const p = renderProperty();
    const product = document.querySelector('input[name="a-product"]:checked').value;
    const productName = { simple: 'Bankwest Simple Home Loan', fixed: 'Fixed Rate Home Loan', package: 'Complete Home Loan Package' }[product];
    const rate = product === 'fixed' ? 6.49 : 6.24;
    const offsetFee = product === 'package' ? '$0 a month, $395 a year package fee' : '$0 a month on your first offset';

    const boosters = [
      $('a-roundups').checked && 'Roundups',
      $('a-split').checked && 'Payment Split $400/mo',
      $('a-rk').checked && 'Rate Keeper'
    ].filter(Boolean);

    const linked = renderLinking();

    const rows = [
      ['Product', `${productName} — ${rate.toFixed(2)}% p.a.`],
      ['Property', $('a-address').value],
      ['Loan amount', fmt.money(p.loan)],
      ['LVR', `${p.lvr.toFixed(1)}%`],
      ['LMI, estimated', p.lvr > 80 ? fmt.money(finance.lmi(p.loan, p.lvr)) : 'None'],
      ['Repayment, principal and interest', `${fmt.money(finance.repayment(p.loan, rate, 30))} a month over 30 years`],
      ['Offset account', offsetFee],
      ['Accounts linked at settlement', `${fmt.money(linked)} offsetting from day one`],
      ['Boosters', boosters.length ? boosters.join(' · ') : 'None selected']
    ];

    $('review').innerHTML = rows.map(([k, v]) =>
      `<div class="stat-row"><dt>${k}</dt><dd style="text-align:right">${v}</dd></div>`).join('');
  }

  function show(i) {
    step = Math.max(0, Math.min(STEPS.length - 1, i));
    panels.forEach((p) => { p.hidden = Number(p.dataset.step) !== step; });
    dots.forEach((d, di) => { d.dataset.done = String(di <= step); });

    stepTitle.textContent = STEPS[step].title;
    stepSub.textContent = STEPS[step].sub;

    const isDone = step === STEPS.length - 1;
    stepCount.textContent = isDone ? 'Complete' : `Step ${step + 1} of ${STEPS.length - 1}`;
    nav.hidden = isDone;
    back.disabled = step === 0;
    nextLabel.textContent = step === STEPS.length - 2 ? 'Submit application' : 'Continue';

    if (step === 2) renderProperty();
    if (step === 5) renderReview();

    document.getElementById('application').scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  next.addEventListener('click', () => show(step + 1));
  back.addEventListener('click', () => show(step - 1));
  $('restart').addEventListener('click', () => show(0));

  // Deep links from Home Zone / Deposit Saver / Boosters land straight in the flow.
  if (new URLSearchParams(location.search).get('from')) {
    document.getElementById('application').scrollIntoView({ block: 'start' });
  }
})();
