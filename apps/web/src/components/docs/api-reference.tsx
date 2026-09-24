import spec from '@/content/openapi.json';

type Schema = {
  $ref?: string;
  type?: string;
  format?: string;
  enum?: (string | null)[];
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  description?: string;
  example?: unknown;
  nullable?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  default?: unknown;
};
type Param = { name: string; in: string; required?: boolean; description?: string; schema?: Schema };
type Operation = {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Param[];
  security?: unknown[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: Schema }> }>;
};

const schemas = (spec as { components: { schemas: Record<string, Schema> } }).components.schemas;
const paths = (spec as unknown as { paths: Record<string, Record<string, Operation>> }).paths;

const STATUS_TEXT: Record<string, string> = {
  '200': 'OK',
  '201': 'Created',
  '204': 'No content',
  '400': 'Validation error',
  '401': 'Missing or invalid token',
  '403': 'Not allowed',
  '404': 'Not found',
  '409': 'Conflict',
  '429': 'Rate limited',
};

const TAG_TITLES: Record<string, string> = {
  auth: 'Authentication',
  events: 'Events',
  rsvps: 'RSVPs',
  me: 'Current user',
  health: 'Health',
};
const TAG_ORDER = ['auth', 'events', 'rsvps', 'me', 'health'];

const METHOD_STYLE: Record<string, string> = {
  get: 'bg-accent-soft text-accent',
  post: 'bg-going-soft text-going',
  patch: 'bg-wait-soft text-wait',
  delete: 'bg-danger-soft text-danger',
};

const refName = (ref?: string) => ref?.split('/').pop();
const resolve = (s?: Schema): Schema | undefined => (s?.$ref ? schemas[refName(s.$ref)!] : s);

function typeLabel(s?: Schema): string {
  if (!s) return 'any';
  if (s.$ref) return refName(s.$ref)!;
  if (s.type === 'array') return `${typeLabel(s.items)}[]`;
  if (s.enum) return s.enum.filter((v) => v !== null).map((v) => `"${v}"`).join(' | ');
  return s.format ? `${s.type} (${s.format})` : (s.type ?? 'any');
}

function constraints(s: Schema) {
  const out: string[] = [];
  if (s.minLength != null) out.push(`min ${s.minLength} chars`);
  if (s.maxLength != null) out.push(`max ${s.maxLength} chars`);
  if (s.minimum != null) out.push(`≥ ${s.minimum}`);
  if (s.maximum != null) out.push(`≤ ${s.maximum}`);
  if (s.nullable) out.push('nullable');
  if (s.default !== undefined) out.push(`default ${JSON.stringify(s.default)}`);
  return out.join(' · ');
}

function Fields({ schema }: { schema?: Schema }) {
  const s = resolve(schema);
  if (!s?.properties) return null;
  const required = new Set(s.required ?? []);
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-raised text-left text-xs uppercase tracking-wider text-muted">
            <th className="px-3 py-2 font-semibold">Field</th>
            <th className="px-3 py-2 font-semibold">Type</th>
            <th className="px-3 py-2 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(s.properties).map(([name, prop]) => (
            <tr key={name} className="border-t border-line align-top">
              <td className="px-3 py-2 font-mono text-[13px]">
                {name}
                {required.has(name) && <span className="text-danger" title="required">*</span>}
              </td>
              <td className="px-3 py-2 font-mono text-[13px] text-muted">{typeLabel(prop)}</td>
              <td className="px-3 py-2 text-muted">
                {[prop.description, constraints(prop)].filter(Boolean).join(' — ')}
                {prop.example !== undefined && (
                  <span className="block font-mono text-[12px]">e.g. {JSON.stringify(prop.example)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const API_TAGS = TAG_ORDER.map((t) => ({ id: `api-${t}`, title: TAG_TITLES[t] }));

/** The API reference, generated at build time from the NestJS OpenAPI spec. */
export function ApiReference({ swaggerUrl }: { swaggerUrl: string }) {
  const ops = Object.entries(paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, op]) => ({ path, method, op })),
  );

  return (
    <div className="space-y-10">
      <div className="prose-docs">
        <h2 id="api-reference">API reference</h2>
        <p>
          Generated from the API&apos;s live OpenAPI spec, so it always matches the code. For interactive calls, use{' '}
          <a href={swaggerUrl} target="_blank" rel="noreferrer">
            Swagger UI
          </a>
          . Fields marked <span className="text-danger">*</span> are required. 🔒 means a bearer token is needed.
        </p>
      </div>

      {TAG_ORDER.map((tag) => (
        <section key={tag} id={`api-${tag}`} className="scroll-mt-20 space-y-4">
          <h3 className="font-display text-xl font-semibold">{TAG_TITLES[tag]}</h3>
          {ops
            .filter(({ op }) => op.tags?.[0] === tag)
            .map(({ path, method, op }) => {
              const body = op.requestBody?.content?.['application/json']?.schema;
              const params = op.parameters ?? [];
              return (
                <details key={method + path} className="group rounded-xl border border-line bg-surface open:shadow-sm">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3">
                    <span
                      className={`w-16 shrink-0 rounded-md px-2 py-1 text-center font-mono text-xs font-bold uppercase ${METHOD_STYLE[method]}`}
                    >
                      {method}
                    </span>
                    <code className="font-mono text-sm font-semibold">{path.replace('/api/v1', '')}</code>
                    {op.security?.length ? <span title="Requires a bearer token">🔒</span> : null}
                    <span className="min-w-0 flex-1 truncate text-sm text-muted">{op.summary?.split('\n')[0]}</span>
                    <span className="text-muted transition-transform group-open:rotate-90" aria-hidden>
                      ›
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-line px-4 py-4 text-sm">
                    {op.summary && <p className="whitespace-pre-line">{op.summary}</p>}
                    <p className="font-mono text-xs text-muted">
                      {method.toUpperCase()} /api/v1{path.replace('/api/v1', '')}
                    </p>

                    {params.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Parameters</h4>
                        <ul className="space-y-1">
                          {params.map((p) => (
                            <li key={p.in + p.name}>
                              <code className="font-mono text-[13px]">{p.name}</code>
                              {p.required && <span className="text-danger">*</span>}{' '}
                              <span className="text-muted">
                                ({p.in}, {typeLabel(p.schema)}){p.description ? ` — ${p.description}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {body && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Request body · <span className="font-mono normal-case">{typeLabel(body)}</span>
                        </h4>
                        <Fields schema={body} />
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Responses</h4>
                      <ul className="space-y-1">
                        {Object.entries(op.responses ?? {}).map(([code, res]) => {
                          const schema = res.content?.['application/json']?.schema;
                          return (
                            <li key={code}>
                              <span
                                className={`mr-2 font-mono font-semibold ${code.startsWith('2') ? 'text-going' : 'text-danger'}`}
                              >
                                {code}
                              </span>
                              {res.description || STATUS_TEXT[code]}
                              {schema && <span className="ml-1 font-mono text-[13px] text-muted">→ {typeLabel(schema)}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </details>
              );
            })}
        </section>
      ))}

      <section id="api-schemas" className="scroll-mt-20 space-y-4">
        <h3 className="font-display text-xl font-semibold">Response models</h3>
        {['EventResponse', 'RsvpResponse', 'AttendeePage', 'AuthTokensResponse'].map((name) => (
          <div key={name} className="space-y-2">
            <h4 className="font-mono text-sm font-semibold">{name}</h4>
            <Fields schema={{ $ref: `#/components/schemas/${name}` }} />
          </div>
        ))}
      </section>
    </div>
  );
}
