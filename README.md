# Bankwest home

A concept prototype of a home loan experience: the existing Bankwest home loans
proposition kept intact, with six product additions drawn from what Up does well.

**This is an unofficial design concept.** It is not an official Bankwest site and
was not built or operated by Bankwest or the Commonwealth Bank of Australia. Every
rate, fee, account and projection in it is illustrative or fictional, no
application is submitted, and nothing here is financial advice. The prototype
notice appears on every page.

It uses Bankwest's own brand assets, so treat it as internal concept work: it is
suitable for a pitch, a review or a portfolio piece, but it should not be put on a
public URL without Bankwest's sign-off.

## What's kept from the original

The full existing proposition is carried over: the Simple Home Loan and Fixed Rate
Home Loan (owner-occupier and investor rates, comparison rates, feature lists), the
$395 Complete Home Loan Package with its three inclusions, the three calculators,
"what you'll get", the six loan situations, the specialist-led application steps,
the guides, the awards block, the ten common questions, and the full "things to
consider" disclaimer set. The design system — colour, radius, spacing and type
tokens — was read from the production Bankwest stylesheet and reused, so the new
surfaces sit inside the existing visual language rather than beside it.

## The brand lockup

`assets/img/bankwest-logo.svg` is the official logo, taken unmodified from
bankwest.com.au apart from two fixes: the published file uses JSX-style
`clipPath` / `fillOpacity` attributes and points at a clip path whose `<defs>`
were never included, neither of which is valid in an HTML document.

"home" sits beside it as live text rather than baked-in artwork. The logo is
133×20, so the wordmark's x-height is 11 units; Figtree needs ~1.04× the logo
height to land on the same x-height, and weight 500 matches the wordmark's
stroke. Both are expressed against a single `--brand-h` custom property so the
lockup scales as one piece and drops to 16px on mobile.

The footer carries the plain logo with no "home", reversed to white via
`filter: invert(1)` — the source is solid black with alpha preserved, so this
produces the same 90% white the original renders at.

`assets/img/favicon.svg` is the Bankwest mark on its own, cut from the last path
of the logo file and centred in a square viewBox.

## What's new

| # | Addition | Where |
|---|---|---|
| 1 | **Home Zone** — borrowing power derived from twelve months of real transaction data rather than a manual expense form | [home-zone.html](home-zone.html) |
| 2 | **Free offset tier** — the first 100% offset on the Simple Home Loan drops to $0/month, with a widget showing what the old $10 fee cost | [index.html#offsets](index.html) |
| 3 | **Home Deposit Saver** — a pre-purchase savings product that costs the whole upfront bill and projects the month you're ready | [deposit-saver.html](deposit-saver.html) |
| 4 | **Automatic account linking** — offset opened and existing Bankwest savings linked at settlement, with a consent screen rather than a separate application | [apply.html](apply.html) step 5, plus a section on the homepage |
| 5 | **Self-serve digital application** — a parallel path to the specialist model, with triage that routes honestly to a human when the case warrants it | [apply.html](apply.html) |
| 6 | **Repayment Boosters** — roundups, payment splits and Rate Keeper feeding the offset | [boosters.html](boosters.html) |

## Structure

```
index.html            Home loans — everything existing, plus entry points to the six additions
home-zone.html        Borrowing estimate from transaction data
deposit-saver.html    Deposit projection with an upfront-cost breakdown and a savings chart
boosters.html         Offset simulator: roundups, splits, Rate Keeper
apply.html            Path triage + six-step self-serve application
assets/img/           Bankwest logo (from bankwest.com.au) + favicon cut from its mark
assets/css/style.css  Design system (tokens mirrored from the live site)
assets/js/main.js     Nav, tabs, accordions, currency/date formatting, loan maths
assets/js/*.js        One module per interactive page
netlify.toml          Publish config, headers, pretty-URL redirects
```

Everything is static. No build step, no dependencies, no network calls beyond the
Google Fonts stylesheet.

## Running it locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploying to Netlify

Drag the folder onto <https://app.netlify.com/drop>, or:

```bash
npx netlify-cli deploy --dir . --prod
```

`netlify.toml` sets the publish directory, security headers and extensionless
URL rewrites, so no dashboard configuration is needed.

## The financial model

The maths is real, not decorative — the numbers move the way they would in an
assessment:

- **Serviceability** — income shaded (bonuses excluded, savings interest at 80%),
  one-off spend stripped out, living expenses floored at a household benchmark,
  credit card limits assessed at 3.8%/month of the limit, and the surplus tested
  against a repayment at the product rate plus a 3.00% buffer. Borrowing power is
  the present value of that annuity, then capped at 95% LVR by the deposit.
- **Offset** — interest is charged on `balance − offset` each month while the
  contracted repayment stays fixed, which is why a growing offset clears the loan
  early without an extra repayment. Boosters model this month by month.
- **Deposit projection** — compounds the balance monthly against a target that
  includes deposit, transfer duty, legals and moving, and that can itself grow if
  you set a price growth rate. Unreachable targets are reported as unreachable
  rather than clamped to a flattering date.
- **Duty and LMI** — illustrative NSW-style transfer duty bands with a first-home
  concession, and LMI premiums banded by LVR.

Assumptions are stated on each page and in the disclaimer sections.
