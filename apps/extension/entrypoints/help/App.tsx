import { useState } from 'react';
import { AppShell, Card, SearchField } from '@specter/ui';
import { HELP_ARTICLES, HELP_CATEGORIES, type HelpArticle } from '@specter/help';
import { openTab } from '../../src/nav';

function matches(a: HelpArticle, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  return `${a.title} ${a.description} ${a.category}`.toLowerCase().includes(t);
}

export default function App() {
  const [q, setQ] = useState('');
  const filtered = HELP_ARTICLES.filter((a) => matches(a, q));

  return (
    <AppShell title="Help Center" onHelp={() => openTab('help')}>
      <div className="space-y-4">
        <SearchField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search help articles"
        />
        {HELP_CATEGORIES.map((cat) => {
          const arts = filtered.filter((a) => a.category === cat);
          if (!arts.length) return null;
          return (
            <Card key={cat}>
              <h2 className="mb-3 font-display text-lg text-specter-text">{cat}</h2>
              <ul className="space-y-2">
                {arts.map((a) => (
                  <li key={a.slug}>
                    <button
                      type="button"
                      className="text-left text-specter-pale-violet hover:underline focus-visible:outline-2 focus-visible:outline-specter-pale-violet"
                    >
                      {a.title}
                    </button>
                    <p className="text-sm text-specter-muted">{a.description}</p>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
        {!filtered.length ? (
          <Card>
            <p className="text-specter-muted">No articles match your search.</p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
