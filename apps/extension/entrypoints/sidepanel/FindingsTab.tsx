import { useState } from 'react';
import type { ClauseFinding, ExtractedDocument } from '@specter/core';
import { Button, Card, Chip, InsetCard, SourceQuote } from '@specter/ui';
import { sortFindings, useFindings, type ImpactFilter } from '../../src/findingsStore';
import { ANALYSIS_MESSAGE, CATEGORY_LABEL, coverageLabel } from '../../src/labels';
import { showOnPage, type ShowResult } from '../../src/showOnPage';
import { useSidePanel } from '../../src/store/sidepanel';

const IMPACT: Record<ClauseFinding['concern'], { label: string; chip: 'high' | 'medium' | 'neutral'; card: 'high' | 'medium' | 'default' }> = {
  high: { label: 'High impact', chip: 'high', card: 'high' },
  medium: { label: 'Medium impact', chip: 'medium', card: 'medium' },
  low: { label: 'Low impact', chip: 'neutral', card: 'default' },
};

const SHOW_NOTICE: Record<ShowResult, string | null> = {
  found: null,
  missing: "Live highlighting isn't available. Showing the saved passage.",
  stale: 'This agreement came from another tab. Run analysis again on this page.',
  no_tab: 'No tab is open to show this on.',
};

const FILTERS: { id: ImpactFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

/**
 * Findings tab (design steering section 4 and 6C). Shows only verified
 * findings. Each card carries its quote, section and evidence label. Nothing
 * here is claimed as safe: an empty list only means nothing was found in
 * what Specter could read.
 */
export function FindingsTab() {
  const { doc, tabId, mode, failure, findings, rejected, candidateCount, filter, dismissed, setFilter, dismiss } =
    useFindings();
  const [notice, setNotice] = useState<string | null>(null);

  if (!doc) {
    return (
      <div className="space-y-3">
        <h3 className="text-h3 font-semibold">Findings</h3>
        <Card>
          <p className="text-muted">Nothing has been analyzed yet. Open the Page tab and press Analyze agreement.</p>
        </Card>
      </div>
    );
  }

  const coverage = coverageLabel(doc.completeness);
  const live = sortFindings(findings).filter((f) => !dismissed.includes(f.id));
  const shown = live.filter((f) => filter === 'all' || f.concern === filter);
  const countOf = (id: ImpactFilter) => (id === 'all' ? live.length : live.filter((f) => f.concern === id).length);

  return (
    <div className="space-y-3">
      <Card variant={coverage.complete ? 'default' : 'medium'}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Chip variant={coverage.complete ? 'ok' : 'medium'}>{coverage.text}</Chip>
          {mode === 'limited' ? <Chip>Limited · on-device only</Chip> : null}
        </div>
        <h3 className="text-h3 font-semibold">{doc.title || 'Untitled agreement'}</h3>
      </Card>

      {mode === 'limited' ? (
        <LimitedCard failure={failure} candidateCount={candidateCount} />
      ) : null}

      {mode === 'ai' ? (
        <>
          <div role="group" aria-label="Filter by impact" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={
                  'min-h-[44px] rounded-full border px-3 text-small font-semibold ' +
                  (filter === f.id ? 'border-ghost text-ghost' : 'border-line text-muted')
                }
              >
                {f.label} ({countOf(f.id)})
              </button>
            ))}
          </div>

          {notice ? (
            <Card variant="medium">
              <p className="text-small text-fg" role="status">
                {notice}
              </p>
            </Card>
          ) : null}

          {live.length === 0 ? (
            <Card>
              <p className="text-fg">No clauses of concern were found in what Specter could read.</p>
              <p className="mt-1 text-small text-muted">
                {coverage.complete ? 'The whole agreement was read.' : 'Part of the agreement could not be read.'}
              </p>
            </Card>
          ) : null}

          {shown.map((f) => (
            <FindingCard
              key={f.id}
              finding={f}
              doc={doc}
              tabId={tabId}
              onDismiss={() => dismiss(f.id)}
              onNotice={(text) => setNotice(text)}
            />
          ))}

          <p className="text-caption text-muted">
            Quotes verified: {findings.length} of {findings.length + rejected}.
            {rejected > 0 ? ` ${rejected} drafted ${rejected === 1 ? 'point' : 'points'} failed the quote check and ${rejected === 1 ? 'is' : 'are'} not shown.` : ''}
          </p>
        </>
      ) : null}

      <InsetCard>
        <p className="text-caption text-muted">Informational assistance, not legal advice.</p>
      </InsetCard>
    </div>
  );
}

function LimitedCard({ failure, candidateCount }: { failure: string | null; candidateCount: number }) {
  const message = ANALYSIS_MESSAGE[(failure ?? 'no_provider') as keyof typeof ANALYSIS_MESSAGE];
  const sentNothing = failure === null || failure === 'no_provider' || failure === 'no_key';
  return (
    <Card>
      <h4 className="text-h4 font-semibold">Clause findings need an AI model</h4>
      <p className="mt-1 text-small text-muted">{message}</p>
      <p className="mt-2 text-small text-fg">
        Specter screened {candidateCount} {candidateCount === 1 ? 'section' : 'sections'} that may hold clauses.
        {sentNothing ? ' Nothing has been sent.' : ''}
      </p>
      {failure === 'no_provider' || failure === 'no_key' || failure === 'invalid_key' ? (
        <Button className="mt-3" variant="secondary" onClick={() => useSidePanel.getState().openDrill('ai')}>
          AI connectivity
        </Button>
      ) : null}
    </Card>
  );
}

function FindingCard({
  finding,
  doc,
  tabId,
  onDismiss,
  onNotice,
}: {
  finding: ClauseFinding;
  doc: ExtractedDocument;
  tabId: number | null;
  onDismiss: () => void;
  onNotice: (text: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const section = doc.sections.find((s) => s.id === finding.evidence.sectionId);
  const impact = IMPACT[finding.concern];
  const quote = finding.evidence.exactQuote;

  const show = async () => {
    const result = await showOnPage(finding, doc, tabId);
    onNotice(SHOW_NOTICE[result]);
  };

  return (
    <Card variant={impact.card}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-caption font-semibold uppercase tracking-wide text-muted">
          {CATEGORY_LABEL[finding.category]}
        </span>
        <Chip variant={impact.chip}>{impact.label}</Chip>
      </div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="mt-2 block min-h-[44px] w-full text-left text-h4 font-semibold text-fg"
      >
        {finding.summary}
      </button>
      {open ? (
        <>
          <p className="text-small text-muted">{finding.implication}</p>
          <div className="mt-3">
            <SourceQuote text={quote} mark={[0, quote.length]} cite={section?.heading} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-caption text-muted">{section ? `§ ${section.heading}` : 'Section not listed'}</span>
            <Chip variant="ok">Source verified</Chip>
          </div>
          {finding.notStated.map((item, i) => (
            <p key={i} className="mt-2 text-caption text-muted">
              Not stated: {item}
            </p>
          ))}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={show}>
              Show on page
            </Button>
            <Button
              variant="secondary"
              onClick={() => useSidePanel.getState().askAbout(`Explain this clause: ${finding.summary}`)}
            >
              Explain
            </Button>
            <Button variant="quiet" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}
