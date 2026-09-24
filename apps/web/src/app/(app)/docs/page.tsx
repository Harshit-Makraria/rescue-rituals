import GithubSlugger from 'github-slugger';
import type { Metadata } from 'next';
import { API_TAGS, ApiReference } from '@/components/docs/api-reference';
import { Markdown } from '@/components/docs/markdown';
import readme from '@/content/readme.generated';
import { API_URL } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Architecture, data model, concurrency design and API reference for the Gather events platform.',
};

/** Table of contents from the README's `## ` headings, with GitHub-compatible anchors. */
function readmeSections(md: string) {
  const slugger = new GithubSlugger();
  const body = md.replace(/```[\s\S]*?```/g, ''); // ignore headings inside code blocks
  return [...body.matchAll(/^## (.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((title) => title !== 'Contents')
    .map((title) => ({ title, id: slugger.slug(title) }));
}

export default function DocsPage() {
  // The README's own "Contents" list duplicates the sidebar; drop it from the page body.
  const source = readme.replace(/## Contents[\s\S]*?(?=\n---)/, '');
  const sections = readmeSections(readme);
  const swaggerUrl = `${API_URL}/docs`;

  return (
    <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
        <nav aria-label="Documentation" className="space-y-6 text-sm">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Guide</p>
            <ul className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-md px-2 py-1 text-muted hover:bg-surface hover:text-ink">
                    {s.title.replace(/^\d+\.\s*/, '')}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">API reference</p>
            <ul className="space-y-1">
              {[...API_TAGS, { id: 'api-schemas', title: 'Response models' }].map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="block rounded-md px-2 py-1 text-muted hover:bg-surface hover:text-ink">
                    {t.title}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={swaggerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md px-2 py-1 font-semibold text-accent hover:bg-surface"
                >
                  Open Swagger UI ↗
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <article className="min-w-0 space-y-16">
        <Markdown source={source} />
        <ApiReference swaggerUrl={swaggerUrl} />
      </article>
    </div>
  );
}
