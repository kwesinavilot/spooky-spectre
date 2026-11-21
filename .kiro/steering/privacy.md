# Specter — Privacy

- Nothing leaves the device except text the user explicitly analyzes, sent to the provider they chose.
- Show a one-time consent explaining that before the first analysis.
- Background detection is opt-in. The onboarding step must say plainly that Chrome will warn
  that Specter can "read and change data on all websites", that detection runs only on this
  device using rules, and that nothing is sent anywhere until the user clicks Analyze.
  Declining must be as easy as accepting, and the choice can be changed in Options.
- Background detection never stores page text. It keeps only what it needs to show the
  indicator for the current tab.
- Exclude password and payment fields, and the default excluded domains list. Excluded domains
  are skipped by background detection too.
- Provide delete one, delete all and export (JSON) for saved data.
- Never read password or payment fields.
- Keys are stored only in `chrome.storage.local` and never logged.
- Never log document text.
