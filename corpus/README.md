# Corpus

Saved copies of 10 public terms, privacy and cookie-banner pages, used to measure detection and
extraction on real markup (Spec 2, tasks 7.1 to 7.4). The copies belong to their owners and are
kept here only as regression fixtures. Scripts were stripped when saving.

| File | What it is |
| --- | --- |
| `sources.json` | The pages and where they come from |
| `manifest.json` | For each page: source URL, capture date, expected kinds and 2 to 5 phrases that must appear in the extracted text |
| `pages/*.html` | The saved copies |
| `report.json` | The latest results, written by `pnpm corpus:report` |

```bash
pnpm corpus:add --sources                 # re-capture every page in sources.json
pnpm corpus:add <url> <name> [kind,kind]  # add one page, then fill in its manifest phrases
pnpm corpus:report                        # run the report; fails below 7 of 10
```

A page passes when every expected kind is detected, every expected phrase is in the extracted
text, and completeness is at least 0.8.

## Latest result: 7 of 10 (2026-11-21)

| Page | Result | Why |
| --- | --- | --- |
| GitHub Terms of Service | Pass | 69 sections, coverage complete |
| Mozilla Accounts Terms of Service | Pass | Also reports a cookie banner: Mozilla ships its consent banner in the page HTML |
| Automattic (WordPress.com) Terms of Service | Pass | Product terms in folded sections are read; a "Read more" control caps coverage at 90% |
| Dropbox Terms of Service | Pass | Extracted as one section: the page has no heading elements around the terms |
| Firefox Privacy Notice | Pass | Title and summary sit outside `<main>`; also reports Mozilla's banner |
| DuckDuckGo Privacy Policy | Pass | |
| Signal Terms & Privacy Policy | Pass | Detected as both terms and privacy |
| GOV.UK home | Fail | The banner is in the HTML but hidden until GOV.UK's script decides to show it, so a saved copy has no visible banner |
| The Guardian (UK) home | Fail | The consent banner is injected by a script that the saved copy does not include |
| legislation.gov.uk home | Fail | Same: the banner is script-injected |

What this measures, honestly: Specter reads real terms and privacy pages well, including ones with
awkward markup. Cookie banners on major sites are mostly added by scripts after the page loads, so
saved copies cannot test them. In Chrome, background detection watches for 15 seconds after load to
catch banners like these (FR-DET-10); that needs the manual check in Spec 2 task 6.4.

Rules changed because of this corpus (all general, none page-specific): pages can be both terms and
privacy; a page title outside `<main>` widens the extraction root; folded sections are read; a
collapsed table of contents is not counted as missing text; hidden banners are not banners; a banner
must offer accept or reject.
