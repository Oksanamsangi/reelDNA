"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type Audit = Record<string, unknown>;

type SavedAudit = {
  profile_handle: string;
  profile_data?: unknown;
  audit: Audit;
  updated_at?: string;
};

const SECTION_META: Record<string, { title: string; subtitle: string; number: string }> = {
  executive_summary: { title: "Executive Summary", subtitle: "The big picture: what is working and what needs attention", number: "01" },
  brand_dna: { title: "Brand DNA", subtitle: "Niche, positioning, personality and visual identity", number: "02" },
  profile_analysis: { title: "Profile Analysis", subtitle: "How clearly the profile communicates its value", number: "03" },
  content_analysis: { title: "Content Analysis", subtitle: "Patterns, strengths, weaknesses and formats to test", number: "04" },
  audience_intelligence: { title: "Audience Intelligence", subtitle: "Likely audience, motivations, needs and objections", number: "05" },
  growth_strategy: { title: "Growth Strategy", subtitle: "Content pillars, Reel concepts and discoverability", number: "06" },
  profile_bio_options: { title: "Bio Recommendations", subtitle: "Alternative profile bios and the reasoning behind them", number: "07" },
  quick_wins: { title: "Quick Wins", subtitle: "Practical improvements you can make right away", number: "08" },
};

const SECTION_ORDER = [
  "executive_summary", "brand_dna", "profile_analysis", "content_analysis",
  "audience_intelligence", "growth_strategy", "profile_bio_options",
  "quick_wins",
];

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === "string" ? item : "").filter(Boolean);
}

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-zinc-500">No data available</span>;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span className="whitespace-pre-wrap leading-7">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-zinc-500">No data available</span>;
    return (
      <ul className="space-y-3">
        {value.map((item, index) => (
          <li key={index} className="flex gap-3">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime-300" />
            <div className="min-w-0 flex-1 text-sm leading-7 text-zinc-300">{renderValue(item)}</div>
          </li>
        ))}
      </ul>
    );
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (!entries.length) return <span className="text-zinc-500">No data available</span>;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map(([key, item]) => (
          <div key={key} className="min-w-0 rounded-xl border border-white/[0.06] bg-black/10 p-4">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {label(key)}
            </h4>
            <div className="text-sm leading-7 text-zinc-300">{renderValue(item)}</div>
          </div>
        ))}
      </div>
    );
  }

  return String(value);
}

function ReportSection({ sectionKey, value }: { sectionKey: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  const meta = SECTION_META[sectionKey] ?? {
    title: label(sectionKey), subtitle: "Additional analysis", number: "•",
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11141f] transition-colors hover:border-white/[0.14]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-lime-300/15 bg-lime-300/[0.07] text-xs font-semibold tracking-wider text-lime-300">
          {meta.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-white">{meta.title}</span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500 sm:text-sm">{meta.subtitle}</span>
        </span>
        <span className={`ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-white/[0.07] px-5 py-5 sm:px-6 sm:py-6">
          {renderValue(value)}
        </div>
      )}
    </article>
  );
}

function InsightList({ title, items, tone }: {
  title: string; items: string[]; tone: "positive" | "attention";
}) {
  const positive = tone === "positive";
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#11141f] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full ${positive ? "bg-lime-300" : "bg-orange-300"}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="ml-auto text-xs text-zinc-600">{items.length}</span>
      </div>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex gap-3 text-sm leading-6 text-zinc-300">
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${positive ? "bg-lime-300/70" : "bg-orange-300/70"}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No information provided in this section.</p>
      )}
    </div>
  );
}

export default function BrandIntelligencePage() {
  const [profileUrl, setProfileUrl] = useState("");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [handle, setHandle] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState("");
  const [reportCollapsed, setReportCollapsed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/smm/brand-intelligence", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !data?.saved?.audit) return;
        const saved = data.saved as SavedAudit;
        setAudit(saved.audit);
        setHandle(saved.profile_handle);
        setSavedAt(saved.updated_at ?? "");
      })
      .catch(() => {})
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

  async function analyzeProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedProfileUrl = profileUrl.trim();
    setLoading(true);
    setError("");
    setAudit(null);

    try {
      const response = await fetch("/api/smm/brand-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: submittedProfileUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to analyze this profile.");

      setAudit(data.audit);
      setHandle(data.handle);
      setSavedAt(data.generatedAt ?? "");
      setProfileUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const summary = isRecord(audit?.executive_summary) ? audit.executive_summary : {};
  const strengths = stringList(summary.main_strengths);
  const problems = stringList(summary.main_problems);
  const orderedSections = audit
    ? [
        ...SECTION_ORDER.filter((key) => key in audit),
        ...Object.keys(audit).filter((key) => key !== "missing_data" && !SECTION_ORDER.includes(key)),
      ]
    : [];

  return (
    <main className="min-h-screen bg-[#090a12] px-4 py-7 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard/smm" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white">
          <span aria-hidden="true">←</span> Back to SMM Studio
        </a>

        <section className="rdna-card mt-7 overflow-hidden p-5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-lime-300/15 bg-lime-300/[0.08] text-xl text-lime-300">✳</div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-300">
                  AI-powered brand research
                </p>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Brand Intelligence</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                Turn an Instagram profile into a clear picture of its positioning, content, audience and next growth opportunities.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-white/[0.07] bg-black/15 p-4 lg:max-w-md">
              <form onSubmit={analyzeProfile} className="space-y-3">
                <label htmlFor="instagram-url" className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Instagram profile URL
                </label>
                <input
                  id="instagram-url"
                  type="url"
                  required
                  value={profileUrl}
                  onChange={(event) => setProfileUrl(event.target.value)}
                  placeholder="https://www.instagram.com/yourbrand/"
                  className="rdna-input py-3.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !profileUrl.trim()}
                  className="rdna-button-primary flex w-full items-center justify-center gap-2 py-3.5 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-neutral-950" />
                      Analyzing profile…
                    </>
                  ) : "Analyze Instagram →"}
                </button>
              </form>
              {loading && (
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Gathering available profile data and preparing your audit. This may take a few minutes.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm leading-6 text-red-300">
              {error}
            </div>
          )}
          {restoring && !audit && <p className="mt-5 text-xs text-zinc-500">Restoring your saved audit…</p>}
        </section>

        {audit && (
          <section className="mt-8 space-y-6">
            <div className="w-full rounded-2xl border border-[#a3e635]/20 bg-[#090a12] p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a3e635]">Analysis report</p>
                  <p className="mt-1 text-sm text-white/45">{reportCollapsed ? "Report collapsed" : "Full report is open"}</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">@{handle}</h2>
                  {savedAt && <p className="mt-1 text-xs text-zinc-500">Last saved: {new Date(savedAt).toLocaleString()}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReportCollapsed((current) => !current)}
                    className="rounded-full border border-white/10 bg-[#11141f] px-4 py-2 text-sm text-white/75 transition hover:border-[#a3e635]/50 hover:text-white"
                    aria-expanded={!reportCollapsed}
                  >
                    {reportCollapsed ? "Expand analysis ↑" : "Collapse analysis ↓"}
                  </button>

                </div>
              </div>
            </div>

            {!reportCollapsed && (
              <>
            <div className="overflow-hidden rounded-2xl border border-lime-300/15 bg-gradient-to-br from-lime-300/[0.08] via-[#11141f] to-[#11141f] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-300">At a glance</p>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] text-zinc-400">AI audit</span>
              </div>
              <p className="mt-4 max-w-4xl text-lg leading-8 text-zinc-100 sm:text-xl">
                {textValue(summary.overall_assessment, "Your audit is ready. Explore the sections below for the full analysis.")}
              </p>
              {summary.priority !== undefined && summary.priority !== null && summary.priority !== "" && (
                <div className="mt-5 rounded-xl border border-orange-300/15 bg-orange-300/[0.06] p-4">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200/80">Main priority</p>
                  <p className="text-sm leading-7 text-orange-50">{renderValue(summary.priority)}</p>
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <InsightList title="What is working" items={strengths} tone="positive" />
              <InsightList title="Needs attention" items={problems} tone="attention" />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
              <div>
                <h3 className="text-xl font-semibold text-white">Strategic report</h3>
                <p className="mt-1 text-sm text-zinc-500">Explore each area when you are ready. All audit details are preserved.</p>
              </div>
              <span className="text-xs text-zinc-600">{orderedSections.length} sections</span>
            </div>

            <div className="space-y-3">
              {orderedSections.map((key) => <ReportSection key={key} sectionKey={key} value={audit[key]} />)}
            </div>

            <section className="relative overflow-hidden rounded-2xl border border-violet-300/15 bg-gradient-to-br from-violet-400/[0.10] via-[#141321] to-[#11141f] p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-400/[0.08] blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Coming after Meta verification
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-zinc-300">
                    Plans 2 &amp; 3
                  </span>
                </div>

                <div className="mt-5 max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/80">
                    Go beyond public profile data
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    How to Unlock Deeper Insights
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-300 sm:text-base">
                    Connect your Instagram account directly to Brand Intelligence and unlock a deeper level of analytics, powered by your own account data.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-300/[0.10] text-lg text-violet-200">↗</div>
                    <h4 className="text-sm font-semibold text-white">Deeper Profile Analytics</h4>
                    <p className="mt-1.5 text-xs leading-5 text-zinc-400">Go beyond what is visible on a public profile.</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-300/[0.10] text-lg text-violet-200">◎</div>
                    <h4 className="text-sm font-semibold text-white">Audience Insights</h4>
                    <p className="mt-1.5 text-xs leading-5 text-zinc-400">Understand your audience with richer account data.</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-300/[0.10] text-lg text-violet-200">✳</div>
                    <h4 className="text-sm font-semibold text-white">Content Performance</h4>
                    <p className="mt-1.5 text-xs leading-5 text-zinc-400">Unlock more detailed performance insights and recommendations.</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-zinc-400">
                    Available to subscribers on Plans 2 and 3 once Instagram integration is launched.
                  </p>
                  <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/[0.07] px-4 py-2.5 text-xs font-semibold text-violet-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                    Unlock deeper insights
                  </span>
                </div>
              </div>
            </section>

            <div className="border-t border-white/[0.07] pt-6">
              <p className="text-xs leading-5 text-zinc-600">
                This report is based on publicly available profile data. Private Instagram Insights are not included unless supplied.
              </p>
            </div>

              </>
            )}

          </section>
        )}
      </div>
    </main>
  );
}
