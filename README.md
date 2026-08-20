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

The header lockup is two pieces: the Bankwest mark as an `<img>`, and the
outlined "home" as **inline SVG**.

The supplied `home-outlined.svg` draws its outline with a mask — an 11-wide
stroke with a 5.8-wide stroke knocked out of it. SVG masks are rasterised into a
bitmap before compositing, so the outline arrived as pixels while the plain-path
"bankwest" beside it stayed sharp. That is what looked pixelated, and no amount
of resizing fixes it.

The inline copy drops the mask and paints the same two strokes directly instead:
ink at width 11, then `--lockup-bg` at width 5.8 on top. The painted result is
identical to the mask (union of the wide strokes, minus union of the narrow
ones) but it is ordinary vector geometry, so it stays sharp at any size or zoom.
It is inline rather than an `<img>` because the knockout stroke has to read
`--lockup-bg` from the page.

`--lockup-bg` is declared on `.nav-pill` and used as that pill's own
`background`, so the knockout and the surface behind it cannot drift apart. The
pill is opaque `#ff9c35` — exactly what the old `#ff911ee5` composited to over
the header's white — rather than a translucent tint, for the same reason.

`assets/img/home-outlined-vector.svg` is the same mask-free construction as a
standalone file with the colours baked in, for contexts that cannot supply the
variable. Both supplied originals are kept untouched.

**Sizing.** The ring is 2.6 units on a 62-unit-tall "home", so its rendered
weight scales with `--brand-h`: 30px on desktop, 16/15px on mobile. The mark is
133×20 and the "home" 201×62; in the source artwork the latter sits 62/80 as
tall as the mark with a 26/80 gap, which is where the `.775` and `.325` ratios
in the CSS come from.

The first supplied lockup, `bankwest-home-outlined.svg`, also carried its own
`#ff9c3d` backdrop and 40px of padding inside an 840×160 canvas — the backdrop
showed as a lighter rectangle against the pill, and the padding meant sizing by
height shrank the artwork inside its own box. Both are moot now that the mark
and the word are placed separately.

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

## The primary button

The main CTA reproduces Bankwest's own hero-button interaction, taken from the
live site rather than guessed at.

There, the button is a stack of absolutely-positioned layers: a black pill, a
56px orange circle, and a 79px lime circle rotated 45° holding the arrow, with
the sizes driven by inline styles that JavaScript rewrites on hover. Hovering it
shows what those layers are for — an orange panel wipes across the pill from the
left, the badge rides its leading edge to the right and flips to black, and the
arrow un-rotates from ↗ to →. 400ms, ease-in-out.

Ours gets there with CSS only. The wipe is a `::before` (so no extra markup),
kept above the pill but below the label with `isolation: isolate` and
`z-index: -1`. On hover it expands past the 1px border to cover the pill edge to
edge, and the badge animates `left` from `--inset` to
`calc(100% - --badge - --inset)`, which lands it flush right at any button width
without JavaScript.

At rest the fill hides behind the badge, and two details make that airtight.
Both are anchored the same way — `top`/`left` off `--inset`, never `top: 50%` —
so they are provably concentric; anchoring them differently put them 1px apart,
because the pill's `min-height` is a border box while an absolutely positioned
child resolves against the padding box (hence the `+ 2px` in `min-height`). And
the fill is tucked `--tuck` (2px) inside the badge rather than matching it
exactly: two coincident circles each antialias their own edge, which let a thin
orange ring bleed through. The tuck is invisible in motion because the fill is
behind the badge until the wipe starts, so the animation is unchanged.

The arrow is stored as a plain right-arrow path and rotated −45° by CSS at rest,
so a single icon covers both states. `--badge` and `--inset` are the only knobs;
`.btn--sm` just redeclares them.

Every other variant picks up Bankwest's focus ring (2px at 2px offset) and press
state (drops to `--surface-inverse-1`).

## The cost-of-a-home scene

Under the calculators on the homepage, a price slider drives an illustrated block
that builds as the budget does — the same idea as Up's "How much does a home
cost?", built differently.

Up ships **53 pre-drawn SVG frames** (`01.svg` … `53.svg`) stacked in one box with
exactly one at `display: block`; the slider picks a frame index. It's a flipbook,
so the whole picture hard-swaps at every step.

This is one composed scene instead. Each of the 27 parts carries its own
`data-from` (and sometimes `data-to`) threshold, so parts appear and disappear
individually and animate in on their own — the carport arrives without the house
redrawing. Seven tiers at $200k / $400k / $700k / $1.1M / $1.6M / $2.2M / $3M turn
a studio into a two-storey place with a carport, pool, granny flat and hedge run.
The `data-to` pairs handle genuine swaps: the flat roof gives way to a pitched one
at $400k, which moves up a floor at $1.6M.

The scene is inherently wide, so below 720px it keeps a 640px minimum width inside
its own scroller and pans rightward as the block grows, rather than shrinking to an
unreadable strip.

Readouts are calculated, not canned: repayment on an 80% loan at 6.24% over 30
years, cash upfront as a 20% deposit plus transfer duty, legals and moving, and a
minimum gross income on a 43% debt-to-income guide (the same rule of thumb Up
applies — annual repayments ÷ 0.43).

## Structure

```
index.html            Home loans — everything existing, plus entry points to the six additions
home-zone.html        Borrowing estimate from transaction data
deposit-saver.html    Deposit projection with an upfront-cost breakdown and a savings chart
boosters.html         Offset simulator: roundups, splits, Rate Keeper
apply.html            Path triage + six-step self-serve application
assets/img/           Header lockup, Bankwest logo (from bankwest.com.au), favicon
assets/css/style.css  Design system (tokens mirrored from the live site)
assets/js/main.js     Nav, tabs, accordions, currency/date formatting, loan maths
assets/js/cost-scene.js  Threshold-driven illustration + price readouts
assets/js/*.js        One module per interactive page
netlify.toml          Publish config, headers, pretty-URL redirects
```

Everything is static. No build step, no dependencies, no network calls beyond the
Google Fonts stylesheet.

## Website link

https://bankwesthome.netlify.app/

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
