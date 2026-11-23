# Effects and scares

**Status: partly built, not verified in Chrome.** Margin markers appear automatically after an analysis.
Haunting, the spectral pointer, the Possession trigger, the callout, the vignette and drifting ghosts are
built and typecheck. Effect levels on the page (task 9) and the Chrome check (task 19) are open. The
authoritative rules are in `.kiro/steering/design.md` §5; this page summarizes them. The overlay is Spec 6.

## The idea

Specter is used every day, so the scare must stay rare and true. The strongest effect fires only
when a verified, high-impact clause meets a user who is about to agree to it.

## Ghosts in every mode

| Level | Ghosts |
| --- | --- |
| Immersive | Up to three drift once across the screen during Possession |
| Subtle (default) | One ghost rises beside the clause and stays as its marker |
| Quiet, or reduced motion | The ghost marker stays, without movement |

## Effects

| Effect | When |
| --- | --- |
| Whisper | Informational finding: a short purple shimmer |
| Haunting | High or medium finding, "Show on page": a soft pulse ring, then a static outline |
| Spectral pointer | Guides to a clause that is off-screen |
| Possession | Verified high-impact finding at the moment of agreement (below) |
| Resurrection | A saved agreement changed: the old clause rises beside the new one |

## Possession

Fires only when impact is high, the quote is verified, confidence is at least 0.85, and the user is
about to act (pointer within 120px of the submit or Accept button, keyboard focus on it, or "Show on
page"). At most once per site per day and three times a day overall.

In Immersive mode: a vignette on the outer 12% of the screen, slow red pulses on the clause, three
drifting ghosts, and a callout beside the button, for example "Before you press this: renews at
GHS 120 per month (§4.2)", with "Why am I seeing this?".

## Limits

- No flashing; pulses at most once per second.
- Nothing on page load, nothing looping, nothing appears suddenly at full size.
- Never over the site's buttons, form fields, the clause or the callout. The click always works.
- Esc dismisses everything. Sound is opt-in and off by default.
