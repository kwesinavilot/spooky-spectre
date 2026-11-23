import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { askDocument, ProviderError } from '@specter/ai';
import { retrieveSections, type RetrievedSection } from '@specter/core';
import { Button, Card, Chip, InsetCard } from '@specter/ui';
import { budgetChars } from '@specter/ai';
import { connectionFor } from '../../src/analysisRunner';
import { PROVIDERS } from '../../src/aiConnect';
import { getPrefs, TOKEN_BUDGET_DEFAULT } from '../../src/prefs';
import { useFindings } from '../../src/findingsStore';
import { ASK_MESSAGE, type AnalysisFailure } from '../../src/labels';
import { showExcerptOnPage } from '../../src/showOnPage';
import { useSettings } from '../../src/store/settings';
import { useSidePanel } from '../../src/store/sidepanel';

const SUGGESTIONS = [
  'What happens when the trial ends?',
  'Can this company share my information?',
  'How do I cancel?',
];

interface Turn {
  id: number;
  question: string;
  status: 'pending' | 'answered' | 'failed';
  answer?: string;
  notStated?: boolean;
  sources?: RetrievedSection[];
  failure?: AnalysisFailure;
}

let nextId = 1;

/**
 * Ask Specter (design steering 6C). Answers use only the sections of this
 * agreement that match the question, and each answer cites them. Before each
 * question the panel shows what would be sent. The conversation is kept in
 * memory and cleared when another agreement is analyzed.
 */
export function AskTab() {
  const doc = useFindings((s) => s.doc);
  const storedProvider = useSettings((s) => s.providerId);
  const provider = PROVIDERS.find((p) => p.id === storedProvider) ?? null;
  const docKey = doc?.documentHash ?? null;
  const tabId = useFindings((s) => s.tabId);
  const askDraft = useSidePanel((s) => s.askDraft);
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [maxChars, setMaxChars] = useState(budgetChars(TOKEN_BUDGET_DEFAULT));

  useEffect(() => {
    setTurns([]);
    setOpenSource(null);
  }, [docKey]);

  useEffect(() => {
    void getPrefs().then((p) => setMaxChars(budgetChars(p.tokenBudget)));
  }, []);

  // "Explain" on a finding fills the question box. The user reviews it and presses Ask.
  useEffect(() => {
    if (askDraft === null) return;
    setDraft(askDraft);
    useSidePanel.getState().clearAskDraft();
  }, [askDraft]);

  /** Opens the cited passage in the panel and tries to show it on the live page. */
  const openCitation = async (turnId: number, s: RetrievedSection, isOpen: boolean) => {
    const key = `${turnId}:${s.id}`;
    setSourceNotice(null);
    if (isOpen) {
      setOpenSource(null);
      return;
    }
    setOpenSource(key);
    const result = await showExcerptOnPage(s, tabId);
    if (result !== 'found') setSourceNotice("Live highlighting isn't available. Showing the saved passage.");
  };

  // What would be sent for the question being typed. Computed on this device only.
  const plan = useMemo(
    () => (doc && draft.trim() ? retrieveSections(doc, draft, maxChars) : []),
    [doc, draft, maxChars],
  );
  const planChars = plan.reduce((n, s) => n + s.text.length, 0);

  const setTurn = (id: number, patch: Partial<Turn>) =>
    setTurns((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const ask = async (question: string) => {
    const q = question.trim();
    if (!doc || !q || busy) return;
    const sections = retrieveSections(doc, q, maxChars);
    if (sections.length === 0) return;

    const id = nextId++;
    setTurns((list) => [...list, { id, question: q, status: 'pending' }]);
    setDraft('');
    setBusy(true);
    try {
      const conn = await connectionFor(provider?.id ?? null);
      if (!conn.ok) {
        setTurn(id, { status: 'failed', failure: conn.failure });
        return;
      }
      const out = await askDocument({
        provider: conn.provider,
        model: conn.model,
        apiKey: conn.apiKey,
        question: q,
        sections,
      });
      if (out.status === 'invalid_output') {
        setTurn(id, { status: 'failed', failure: 'invalid_output' });
      } else {
        setTurn(id, {
          status: 'answered',
          answer: out.answer,
          notStated: out.notStated,
          sources: sections.filter((s) => out.citations.includes(s.id)),
        });
      }
    } catch (err) {
      setTurn(id, { status: 'failed', failure: err instanceof ProviderError ? err.code : 'error' });
    } finally {
      setBusy(false);
    }
  };

  const retry = (turn: Turn) => {
    setTurns((list) => list.filter((t) => t.id !== turn.id));
    void ask(turn.question);
  };

  if (!doc) {
    return (
      <div className="space-y-3">
        <h3 className="text-h3 font-semibold">Ask Specter</h3>
        <Card>
          <p className="text-muted">Analyze an agreement first. Open the Page tab and press Analyze agreement.</p>
        </Card>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="space-y-3">
        <h3 className="text-h3 font-semibold">Ask Specter</h3>
        <Card>
          <p className="text-fg">Connect an AI model to ask questions</p>
          <p className="mt-1 text-small text-muted">Answers use only the excerpts of this agreement.</p>
          <Button className="mt-3" variant="secondary" onClick={() => useSidePanel.getState().openDrill('ai')}>
            AI connectivity
          </Button>
        </Card>
        <p className="text-caption text-muted">Informational assistance, not legal advice.</p>
      </div>
    );
  }

  const inputId = 'ask-question';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-h3 font-semibold">Ask Specter</h3>
        <Chip variant="ok">Connected</Chip>
      </div>
      <p className="truncate text-small text-muted">{doc.title || 'Untitled agreement'}</p>

      {turns.map((turn) => (
        <div key={turn.id} className="space-y-2">
          <div className="ml-auto max-w-[85%] rounded-[16px] border border-lavender bg-surface-2 px-3 py-2 text-body text-fg">
            {turn.question}
          </div>
          <Card>
            {turn.status === 'pending' ? (
              <p className="text-muted" aria-live="polite">
                Reading the matching sections.
              </p>
            ) : null}

            {turn.status === 'failed' ? (
              <>
                <p className="text-fg" role="alert">
                  {ASK_MESSAGE[turn.failure ?? 'error']}
                </p>
                <Button className="mt-3" variant="secondary" onClick={() => retry(turn)} disabled={busy}>
                  Retry
                </Button>
              </>
            ) : null}

            {turn.status === 'answered' ? (
              <>
                <p className="text-body text-fg">{turn.answer}</p>
                {turn.notStated ? (
                  <div className="mt-2">
                    <Chip>Not stated</Chip>
                  </div>
                ) : null}
                {turn.sources && turn.sources.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {turn.sources.map((s) => {
                      const key = `${turn.id}:${s.id}`;
                      const open = openSource === key;
                      return (
                        <div key={s.id}>
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => void openCitation(turn.id, s, open)}
                            className="min-h-[44px] rounded-full border border-ghost px-3 text-small text-ghost"
                          >
                            § {s.heading || 'Introduction'}
                          </button>
                          {open ? (
                            <div className="mt-2">
                              {sourceNotice ? (
                                <p className="mb-2 text-caption text-muted" role="status">
                                  {sourceNotice}
                                </p>
                              ) : null}
                              <InsetCard>
                                <p className="whitespace-pre-wrap text-small text-fg">{s.text}</p>
                              </InsetCard>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : null}
          </Card>
        </div>
      ))}

      {/* Suggestions show on an empty thread and again after an answer (design steering 6C). */}
      {!busy && turns.every((t) => t.status !== 'pending') ? (
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.filter((s) => !turns.some((t) => t.question === s)).map((s) => (
            <Button key={s} variant="quiet" block onClick={() => void ask(s)}>
              {s}
            </Button>
          ))}
        </div>
      ) : null}

      <form
        className="space-y-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <label htmlFor={inputId} className="text-small font-semibold text-fg">
          Your question
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[44px] w-full rounded-[12px] border border-line bg-inset px-3 text-body text-fg"
        />

        {draft.trim() ? (
          <InsetCard>
            <p className="text-caption text-fg" aria-live="polite">
              {plan.length === 0
                ? 'No section of this agreement mentions these words. Try different words. Nothing is sent.'
                : `Sends ${plan.length} ${plan.length === 1 ? 'section' : 'sections'}, about ${planChars.toLocaleString()} characters, to ${provider.label}. Nothing else from the page.`}
            </p>
          </InsetCard>
        ) : null}

        <Button type="submit" block disabled={busy || plan.length === 0}>
          Ask
        </Button>
      </form>

      <p className="text-caption text-muted">
        Answers use only the excerpts of this agreement. Informational assistance, not legal advice.
      </p>
    </div>
  );
}
