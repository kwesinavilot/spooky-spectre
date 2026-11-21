# Specter — Product

Positioning: *Specter — The things you agree to online shouldn't come back to haunt you.*
Panel subtitle: *Your digital sixth sense.* Onboarding headline: *See what haunts your digital life.*

Specter is a browser companion with three jobs: **see the invisible, explain the consequences,
remember the agreement.** It is not a scam detector and does not put ghosts on every site.

- **Users:** everyday internet users.
- **Tone:** calm, clear, never alarmist, a little eerie in visuals only.
- Never give legal advice. Never use the words *illegal* or *unlawful* about a clause.
- Every finding needs a verified quote. Show what the document does NOT say.

## Product decisions

- **Proactive, not intrusive.** With the user's opt-in, Specter detects agreements locally while
  they browse and shows a small indicator. AI analysis always needs an explicit click or a
  per-site preference.
- **Inform, not decide.** Specter never accepts or rejects cookies, accepts agreements, cancels
  subscriptions, or makes legal judgements for the user.
- **Remember only what was observed.** Consent search covers only choices Specter observed or the
  user confirmed. Never imply knowledge of decisions made elsewhere.

## Feature names

- **Spectral Vision:** on-page highlights (whisper, haunting, possession intensities; can be
  switched off entirely).
- **Contract Exorcist:** the findings report in the side panel.
- **The Graveyard:** saved agreements, consent records, versions and comparisons.

## Scenarios

- **A. Cookie banners:** identify the available controls and explain each choice, for example
  "This website offers a way to reject optional cookies." Never choose for the user.
- **B. Free trials and subscriptions:** highlight auto-renewal, cancellation deadlines and refund
  limits, with amounts and dates only when quoted in the text.
- **C. Terms and privacy policies:** summarize practical implications; answer questions such as
  "Can this company share my information?" with citations to the original text.
- **D. Checkout pages:** highlight refund, return, recurring-payment and cancellation conditions.
  Never call a merchant fraudulent based on unusual terms.

## MVP scope

In: Chrome extension and side panel, cookie banner detection, terms and privacy policy
extraction, AI explanations with source citations, Spectral Vision highlights, saving agreement
snapshots locally, comparing two agreement versions, consent search over saved records.

Later (do not build in MVP): automatic monitoring of saved policies across websites,
subscription and trial reminders, scam and phishing investigation, multi-browser support,
cloud sync and accounts, hosted AI and paid tiers.

## Scares

Specter should genuinely scare people, in the demo and in everyday use, and stay a tool they keep
installed. The scare works because it is rare and true.

- **Scare at the moment of agreement.** The strongest effect (Possession) fires when a verified,
  high-impact clause meets a user about to act: pointer near "Start free trial" or "Accept all",
  focus on the submit button, or "Show on page". Rules are in design steering §5.3.
- **Scare with memory.** The everyday scare is Resurrection: "You agreed to this in March. It
  changed last week." The old clause rises beside the new one when the user revisits a saved
  agreement. (Automatic monitoring is post-MVP, so for now this fires on revisit or Recheck.)
- **Ration it.** Possession at most once per site per day and three times a day overall. A scare
  people see constantly stops working.
- **Never scare on a guess.** No verified quote, no scare. Every scare offers "Why am I seeing this?"
- **Ghosts always.** Every mode has ghosts; Quiet and reduced motion keep them still.
- **Warn, never block.** The site's buttons always work. Specter never delays or prevents a click.

## Demo arc (three minutes)

1. A normal Streamly signup page. Specter is silent apart from a dot on the toolbar icon.
2. Analyze. Findings appear, calm and verified, in the side panel.
3. The cursor moves toward "Start free trial". Possession: edge vignette, the renewal clause
   outlined in red, three ghosts drift past, and the callout states "renews at GHS 120 per month
   (§4.2)". Press "Why am I seeing this?" to show the verified quote.
4. Save to the Graveyard and record "Accepted".
5. Load Streamly v2. Resurrection: the old privacy clause rises beside the new one, showing
   "aggregated" removed and "and affiliated companies" added, with what the text does not say.
6. Ask "What changed since I agreed?" and get a cited answer.
7. Open the benign page: Specter stays quiet. Switch to Quiet mode: the ghosts stay, still.
