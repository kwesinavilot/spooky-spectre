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

Demo priority: the visual reveal of a hidden renewal clause, then the evidence-backed
explanation, then a Graveyard version comparison.
