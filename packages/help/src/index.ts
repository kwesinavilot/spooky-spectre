/**
 * Help Center article catalog (Part 5). Markdown bodies are written in Spec 12;
 * this catalog drives the Help Center shell and the contextual "?" links so every
 * surface can open the right article now.
 */
export interface HelpArticle {
  slug: string;
  title: string;
  category: HelpCategory;
  description: string;
}

export const HELP_CATEGORIES = [
  'Getting started',
  'How-tos',
  'Guides',
  'Trust and safety',
] as const;

export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export const HELP_ARTICLES: HelpArticle[] = [
  // Getting started
  { slug: 'what-specter-does', title: 'What Specter does and does not do', category: 'Getting started', description: 'A calm overview of Specter\u2019s promise and its honest limits.' },
  { slug: 'first-analysis', title: 'Your first analysis in two minutes', category: 'Getting started', description: 'From install to your first verified finding.' },
  { slug: 'pin-toolbar', title: 'Pin Specter to the Chrome toolbar', category: 'Getting started', description: 'Keep Specter one click away on every site.' },
  { slug: 'haunting-levels', title: 'Understanding the haunting levels', category: 'Getting started', description: 'Whisper, Hand, Haunting, and Possession explained.' },

  // How-tos
  { slug: 'get-api-key', title: 'How to get an API key and paste it safely', category: 'How-tos', description: 'Anthropic, OpenAI, or Google keys, kept only in this browser.' },
  { slug: 'ollama-local-model', title: 'How to run a local model with Ollama', category: 'How-tos', description: 'Connect Specter to a local model, no key, no network.' },
  { slug: 'analyze-cookie-banner', title: 'How to analyze a cookie banner', category: 'How-tos', description: 'Point Specter at a banner and read what it says.' },
  { slug: 'read-a-finding', title: 'How to read a finding', category: 'How-tos', description: 'Concern, confidence, and what the text does not state.' },
  { slug: 'show-original', title: 'How to check the original clause', category: 'How-tos', description: 'Jump from a finding to the exact words on the page.' },
  { slug: 'save-agreement', title: 'How to save an agreement and record consent', category: 'How-tos', description: 'Save a snapshot and note whether you accepted.' },
  { slug: 'search-graveyard', title: 'How to search your Graveyard', category: 'How-tos', description: 'Ask questions across your saved agreements.' },
  { slug: 'compare-versions', title: 'How to compare versions', category: 'How-tos', description: 'See what changed and what it means.' },
  { slug: 'set-trial-reminder', title: 'How to set a trial reminder', category: 'How-tos', description: 'Get notified before a trial or renewal date.' },
  { slug: 'report-wrong-finding', title: 'How to report a wrong finding', category: 'How-tos', description: 'Help Specter improve by flagging mistakes.' },
  { slug: 'export-delete-data', title: 'How to export or delete your data', category: 'How-tos', description: 'Take your data with you or erase it all.' },
  { slug: 'turn-off-ghosts', title: 'How to turn off ghosts or reduce motion', category: 'How-tos', description: 'Quiet the page effects or follow your system setting.' },
  { slug: 'allow-block-site', title: 'How to allow or block a site', category: 'How-tos', description: 'Control where Specter may look.' },

  // Guides
  { slug: 'free-trials-renewal', title: 'Free trials and auto-renewal', category: 'Guides', description: 'What to look for before a trial starts.' },
  { slug: 'cancellation-refund', title: 'Cancellation and refund wording', category: 'Guides', description: 'Plain words for common clauses.' },
  { slug: 'sharing-partners', title: 'What \u201csharing with partners\u201d can mean', category: 'Guides', description: 'Data sharing in everyday language.' },
  { slug: 'arbitration-waivers', title: 'Arbitration and class-action waivers', category: 'Guides', description: 'Plain words, not legal advice.' },
  { slug: 'cookie-choices', title: 'Cookie choices: Accept, Reject, Manage', category: 'Guides', description: 'What each button tends to do.' },

  // Trust and safety
  { slug: 'how-verification-works', title: 'How Specter verifies every quote', category: 'Trust and safety', description: 'Evidence or silence: the validator explained.' },
  { slug: 'what-specter-cannot-know', title: 'What Specter cannot know', category: 'Trust and safety', description: 'Agreements outside the browser and private pages.' },
  { slug: 'privacy-leaves-device', title: 'Privacy: what leaves your device', category: 'Trust and safety', description: 'Only the clauses you analyze, to your chosen provider.' },
  { slug: 'not-legal-advice', title: 'Limits: not legal advice', category: 'Trust and safety', description: 'Specter explains, it does not advise.' },
];
