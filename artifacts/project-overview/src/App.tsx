import { useEffect, useMemo, useRef, useState } from "react";
import {
  projectMeta,
  features,
  userFlow,
  inputs,
  outputs,
  keyFiles,
  businessLogic,
  gaps,
  knownIssues,
  type FeatureCategory,
} from "./data/overview";
import { buildMarkdown, buildPlainText } from "./lib/markdown";

const CATEGORY_ORDER: FeatureCategory[] = [
  "Core",
  "LED",
  "Crew & Logistics",
  "Freelance Portal",
  "AI",
  "Persistence",
  "Internationalization",
];

const CATEGORY_DOT: Record<FeatureCategory, string> = {
  Core: "bg-blue-500",
  LED: "bg-orange-500",
  "Crew & Logistics": "bg-emerald-500",
  "Freelance Portal": "bg-violet-500",
  AI: "bg-pink-500",
  Persistence: "bg-amber-500",
  Internationalization: "bg-sky-500",
};

const GAP_PILL: Record<string, string> = {
  Deferred: "bg-amber-100 text-amber-800",
  Partial: "bg-sky-100 text-sky-800",
  "Not started": "bg-rose-100 text-rose-800",
};

const ISSUE_PILL: Record<string, string> = {
  Cosmetic: "bg-slate-100 text-slate-700",
  "Dev-only": "bg-sky-100 text-sky-800",
  Functional: "bg-rose-100 text-rose-800",
};

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="text-3xl font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export default function App() {
  const [generated, setGenerated] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const markdown = useMemo(() => buildMarkdown(), []);
  const plainText = useMemo(() => buildPlainText(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => closeRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);
  const featureCount = features.length;
  const flowCount = userFlow.length;
  const fileCount = keyFiles.length;

  const groupedFeatures = useMemo(() => {
    const m = new Map<FeatureCategory, typeof features>();
    for (const f of features) {
      const arr = m.get(f.category) ?? [];
      arr.push(f);
      m.set(f.category, arr);
    }
    return m;
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              E
            </div>
            <div>
              <div className="text-sm font-semibold">{projectMeta.name}</div>
              <div className="text-xs text-muted-foreground">Project Overview</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              ref={triggerRef}
              onClick={() => {
                setGenerated(true);
                setOpen(true);
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Generate Overview
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-6 py-10">
        {/* Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Snapshot as of today
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            What this app does today
          </h1>
          <p className="max-w-3xl text-muted-foreground">{projectMeta.tagline}</p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            <strong className="text-foreground">Audience:</strong> {projectMeta.audience}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Documented features" value={featureCount} />
          <Stat label="User-flow steps" value={flowCount} />
          <Stat label="Key files" value={fileCount} />
          <Stat label="Known gaps" value={gaps.length} />
        </div>

        {/* Tech stack */}
        <Section id="stack" title="Tech stack" subtitle="What's under the hood">
          <div className="flex flex-wrap gap-2">
            {projectMeta.stack.map((s) => (
              <span
                key={s}
                className="rounded-md border bg-card px-3 py-1.5 text-xs text-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>

        {/* Features */}
        <Section
          id="features"
          title="Main features"
          subtitle={`${featureCount} capabilities grouped by area`}
        >
          <div className="space-y-8">
            {CATEGORY_ORDER.map((cat) => {
              const list = groupedFeatures.get(cat) ?? [];
              if (list.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[cat]}`} />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {cat}
                    </h3>
                    <span className="text-xs text-muted-foreground">({list.length})</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {list.map((f) => (
                      <div
                        key={f.title}
                        className="rounded-xl border bg-card p-4 transition hover:shadow-sm"
                      >
                        <div className="mb-1 text-sm font-semibold">{f.title}</div>
                        <div className="text-sm text-muted-foreground">{f.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* User flow */}
        <Section
          id="flow"
          title="User flow"
          subtitle="From sign-in to client deliverable"
        >
          <ol className="space-y-3">
            {userFlow.map((s, i) => (
              <li key={i} className="flex gap-4 rounded-xl border bg-card p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </div>
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {s.actor}
                  </div>
                  <div className="font-medium">{s.action}</div>
                  <div className="text-sm text-muted-foreground">→ {s.result}</div>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Inputs / Outputs */}
        <Section id="io" title="Inputs & Outputs" subtitle="What goes in, what comes out">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Inputs
              </h3>
              <ul className="space-y-2 text-sm">
                {inputs.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Outputs
              </h3>
              <ul className="space-y-2 text-sm">
                {outputs.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Business logic */}
        <Section id="logic" title="Business logic" subtitle="Where the calculations live">
          <div className="grid gap-3 md:grid-cols-2">
            {businessLogic.map((l) => (
              <div key={l.title} className="rounded-xl border bg-card p-4">
                <div className="mb-1 font-semibold">{l.title}</div>
                <div className="mb-2 text-sm text-muted-foreground">{l.description}</div>
                <div className="font-mono text-xs text-muted-foreground">{l.where}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Key files */}
        <Section id="files" title="Key files & components" subtitle="The map of where things are">
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Path</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Role</th>
                </tr>
              </thead>
              <tbody>
                {keyFiles.map((f) => (
                  <tr key={f.path} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{f.path}</td>
                    <td className="px-4 py-2 text-muted-foreground">{f.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Gaps */}
        <Section
          id="gaps"
          title="Missing or unfinished"
          subtitle="What's deferred, partial, or not started"
        >
          <div className="space-y-3">
            {gaps.map((g) => (
              <div key={g.title} className="flex gap-4 rounded-xl border bg-card p-4">
                <span
                  className={`h-fit shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    GAP_PILL[g.status] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {g.status}
                </span>
                <div>
                  <div className="font-semibold">{g.title}</div>
                  <div className="text-sm text-muted-foreground">{g.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Known issues */}
        <Section id="issues" title="Known issues" subtitle="Stuff to be aware of">
          <div className="space-y-3">
            {knownIssues.map((k) => (
              <div key={k.title} className="flex gap-4 rounded-xl border bg-card p-4">
                <span
                  className={`h-fit shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                    ISSUE_PILL[k.severity] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {k.severity}
                </span>
                <div>
                  <div className="font-semibold">{k.title}</div>
                  <div className="text-sm text-muted-foreground">{k.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer note */}
        <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
          <strong className="text-foreground">How this page is built:</strong> the overview is a
          structured, hand-curated snapshot baked into the app at build time. It describes what
          the codebase actually does today — no invented features. To refresh, edit
          <span className="mx-1 rounded bg-card px-1.5 py-0.5 font-mono text-xs">
            src/data/overview.ts
          </span>
          and reload.
        </div>
      </main>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="overview-modal-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 id="overview-modal-title" className="text-base font-semibold">
                  Generated overview
                </h3>
                <p className="text-xs text-muted-foreground">
                  Copy this back into chat, or download for review.
                </p>
              </div>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <div className="flex items-center gap-2 border-b bg-muted/30 px-5 py-3">
              <button
                onClick={copy}
                className="rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
              <button
                onClick={() =>
                  download(
                    "ehs-project-overview.md",
                    markdown,
                    "text/markdown;charset=utf-8",
                  )
                }
                className="rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Download .md
              </button>
              <button
                onClick={() =>
                  download(
                    "ehs-project-overview.txt",
                    plainText,
                    "text/plain;charset=utf-8",
                  )
                }
                className="rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Download .txt
              </button>
              <div className="ml-auto text-xs text-muted-foreground">
                {markdown.length.toLocaleString()} chars
              </div>
            </div>
            <pre className="scrollbar-thin flex-1 overflow-auto whitespace-pre-wrap break-words bg-background px-5 py-4 text-xs leading-relaxed">
              {markdown}
            </pre>
          </div>
        </div>
      )}

      {/* Hidden initial-generate side-effect for screen-reader users */}
      <span className="sr-only">
        {generated ? "Overview generated" : "Click Generate Overview to assemble the summary."}
      </span>
    </div>
  );
}
