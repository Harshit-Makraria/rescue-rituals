import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { Mermaid } from './mermaid';

const REPO = 'https://github.com/Harshit-Makraria/rescue-rituals/blob/main/';

/** Relative repo links in the README point at files; send them to GitHub. */
function resolveHref(href?: string) {
  if (!href || href.startsWith('#') || /^[a-z]+:/i.test(href)) return href;
  return REPO + href.replace(/^\.?\//, '');
}

export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose-docs">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          a: ({ href, children }) => {
            const url = resolveHref(href);
            const external = url?.startsWith('http');
            return (
              <a href={url} {...(external && { target: '_blank', rel: 'noreferrer' })}>
                {children}
              </a>
            );
          },
          table: ({ children }) => (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          ),
          code: ({ className, children }) => {
            if (className === 'language-mermaid') return <Mermaid chart={String(children).trim()} />;
            return <code className={className}>{children}</code>;
          },
          pre: ({ children, node }) => {
            // Mermaid blocks render their own container instead of a <pre>.
            const first = node?.children?.[0];
            const lang =
              first && 'properties' in first ? (first.properties?.className as string[] | undefined)?.[0] : undefined;
            return lang === 'language-mermaid' ? <>{children}</> : <pre>{children}</pre>;
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
