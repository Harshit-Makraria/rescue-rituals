'use client';

import { useEffect, useId, useRef, useState } from 'react';

function isDark() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Renders a mermaid diagram client-side and re-renders when the theme changes. */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark() ? 'dark' : 'neutral',
          fontFamily: 'inherit',
          securityLevel: 'strict',
        });
        const { svg } = await mermaid.render(`m${id}${Date.now()}`, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (!cancelled) setError(true);
      }
    }
    render();
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', render);
    return () => {
      cancelled = true;
      observer.disconnect();
      media.removeEventListener('change', render);
    };
  }, [chart, id]);

  if (error) {
    return (
      <pre>
        <code>{chart}</code>
      </pre>
    );
  }
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Diagram"
      className="my-5 flex min-h-24 justify-center overflow-x-auto rounded-xl border border-line bg-surface p-4 [&_svg]:max-w-full [&_svg]:max-h-[560px]"
    />
  );
}
