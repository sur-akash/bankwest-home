/* Bankwest home — homepage: "what the old offset fee was costing" widget */

(function () {
  const { fmt, animateNumber } = window.bw;

  const OLD_FEE_PER_OFFSET = 10;   // $/month, every offset account
  const NEW_FREE_OFFSETS = 1;      // first offset now included on Simple
  const PACKAGE_ANNUAL = 395;      // Complete Home Loan Package

  const countEl = document.getElementById('offset-count');
  const yearsEl = document.getElementById('offset-years');
  if (!countEl || !yearsEl) return;

  const out = {
    count: document.getElementById('offset-count-out'),
    years: document.getElementById('offset-years-out'),
    oldMonthly: document.getElementById('off-old-m'),
    newMonthly: document.getElementById('off-new-m'),
    pkg: document.getElementById('off-pkg'),
    saved: document.getElementById('off-saved'),
    note: document.getElementById('off-note')
  };

  function render() {
    const n = Number(countEl.value);
    const years = Number(yearsEl.value);

    const oldMonthly = n * OLD_FEE_PER_OFFSET;
    const newMonthly = Math.max(0, n - NEW_FREE_OFFSETS) * OLD_FEE_PER_OFFSET;

    // On the package, offsets cost nothing but the $395 annual fee does.
    const packageMonthly = PACKAGE_ANNUAL / 12;
    const packageIsCheaper = packageMonthly < newMonthly;
    const bestMonthly = Math.min(newMonthly, packageMonthly);

    const saved = (oldMonthly - bestMonthly) * 12 * years;

    out.count.textContent = String(n);
    out.years.textContent = String(years);
    out.oldMonthly.textContent = fmt.money(oldMonthly);
    out.newMonthly.textContent = newMonthly === 0 ? '$0' : fmt.money(newMonthly);
    out.pkg.textContent = packageIsCheaper
      ? `Yes — ${fmt.money(packageMonthly)}/mo`
      : 'No, stay on Simple';

    animateNumber(out.saved, saved, fmt.money);

    if (n === 1) {
      out.note.textContent = 'One offset, no monthly fee, no package to buy. That’s the fee alone — before any interest the offset saves you.';
    } else if (packageIsCheaper) {
      out.note.textContent = `With ${n} offsets the Complete Package works out cheaper, so that’s what we’d put you on — and we’ll say so in the app rather than charging you per account.`;
    } else {
      out.note.textContent = `Your first offset is free; the other ${n - 1} are ${fmt.money(OLD_FEE_PER_OFFSET)} a month each. That’s the fee alone — before any interest the offsets save you.`;
    }
  }

  countEl.addEventListener('input', render);
  yearsEl.addEventListener('input', render);
  render();
})();
