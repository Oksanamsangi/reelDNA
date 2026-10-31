"use client";

import { useEffect, useState } from "react";

type Strategy = {
  positioning: string;
  audience_insight: string;
  content_pillars: { name: string; purpose: string; ideas: string[] }[];
  weekly_plan: {
    day: string;
    scheduled_date?: string;
    format: string;
    topic: string;
    hook: string;
    cta: string;
    objective?: string;
    shot_list?: string[];
  }[];
  growth_actions: string[];
  success_metrics: { metric: string; why: string; review: string }[];
  first_steps: string[];
};

const initialForm = {
  brand: "",
  product: "",
  audience: "",
  goal: "sales",
  platform: "Instagram",
  tone: "Luxury, warm and authentic",
  cadence: "3 posts/week",
  hoursPerWeek: "3–5 hours",
  resources: "Phone camera, natural light; no face on camera",
  performance: "",
};

type SavedStrategy = {
  id: string;
  title: string;
  plan: {
    form?: typeof initialForm;
    strategy?: Strategy;
    taskStatuses?: Record<string, string>;
  };
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  expires_at?: string | null;
};

const calendarDays = [
  { label: "Monday", short: "MON" },
  { label: "Tuesday", short: "TUE" },
  { label: "Wednesday", short: "WED" },
  { label: "Thursday", short: "THU" },
  { label: "Friday", short: "FRI" },
  { label: "Saturday", short: "SAT" },
  { label: "Sunday", short: "SUN" },
];

function getEdmontonDateOffset(offset: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const date = new Date(
    Date.UTC(get("year"), get("month") - 1, get("day")),
  );

  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export default function SMMStudioPage() {
  const [form, setForm] = useState(initialForm);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [strategyCollapsed, setStrategyCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCalendarBusy, setGoogleCalendarBusy] = useState(false);
  const [googleCalendarMessage, setGoogleCalendarMessage] = useState("");

  const [archivedPlans, setArchivedPlans] = useState<SavedStrategy[]>([]);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [pendingDeletePlan, setPendingDeletePlan] = useState<{ id: string; title: string } | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedTaskIndex === null) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedTaskIndex(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedTaskIndex]);


  useEffect(() => {
    let active = true;

    async function loadGoogleCalendarStatus() {
      try {
        const response = await fetch("/api/google-calendar/status");
        const data = await response.json();

        if (active && response.ok) {
          setGoogleConnected(Boolean(data.connected));
        }
      } catch {
        // Keep the calendar controls available if status checking fails.
      }
    }

    const result = new URLSearchParams(window.location.search).get("googleCalendar");
    const messages: Record<string, string> = {
      connected: "Google Calendar connected successfully.",
      cancelled: "Google Calendar connection was cancelled.",
      state_error: "Security check failed. Please try connecting again.",
      setup_error: "Google Calendar setup failed. Check your OAuth configuration.",
      missing_refresh_token: "Google did not provide a refresh token. Reconnect and approve access.",
      connection_error: "Could not save the Google Calendar connection.",
    };

    if (result && messages[result]) {
      setGoogleCalendarMessage(messages[result]);
      window.history.replaceState({}, "", window.location.pathname);
    }

    void loadGoogleCalendarStatus();

    return () => {
      active = false;
    };
  }, []);

  async function syncGoogleCalendar() {
    if (!planId) {
      setGoogleCalendarMessage("Save your content strategy before syncing.");
      return;
    }

    setGoogleCalendarBusy(true);
    setGoogleCalendarMessage("");

    try {
      const response = await fetch("/api/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Google Calendar sync failed.");
      }

      setGoogleCalendarMessage(
        `Synced ${data.synced} tasks: ${data.created} created, ${data.updated} updated.`,
      );
    } catch (err) {
      setGoogleCalendarMessage(
        err instanceof Error ? err.message : "Google Calendar sync failed.",
      );
    } finally {
      setGoogleCalendarBusy(false);
    }
  }

  async function disconnectGoogleCalendar() {
    if (!window.confirm("Disconnect Google Calendar from Reel DNA?")) return;

    setGoogleCalendarBusy(true);
    setGoogleCalendarMessage("");

    try {
      const response = await fetch("/api/google-calendar/status", {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not disconnect Google Calendar.");
      }

      setGoogleConnected(false);
      setGoogleCalendarMessage("Google Calendar disconnected. Existing events were not deleted.");
    } catch (err) {
      setGoogleCalendarMessage(
        err instanceof Error ? err.message : "Could not disconnect Google Calendar.",
      );
    } finally {
      setGoogleCalendarBusy(false);
    }
  }

  const todayIso = getEdmontonDateOffset(0);

  const calendarDates = calendarDays.map((day, index) => {
    const isoDate = getEdmontonDateOffset(index);
    const date = new Date(`${isoDate}T12:00:00Z`);

    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Edmonton",
      weekday: "long",
    }).format(date);

    return {
      ...day,
      label: weekday,
      short: weekday.slice(0, 3).toUpperCase(),
      isoDate,
      dateLabel: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Edmonton",
        month: "short",
        day: "numeric",
      }).format(date),
      isToday: index === 0,
    };
  });

  useEffect(() => {
    let active = true;

    async function loadSavedPlan() {
      try {
        const response = await fetch("/api/smm/plans");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load your saved plan.");
        }

        if (!active) return;
        setArchivedPlans(data.archivedPlans ?? []);
        if (!data.savedPlan) return;

        const saved = data.savedPlan;
        const plan = saved.plan as {
          form?: typeof initialForm;
          strategy?: Strategy;
          taskStatuses?: Record<string, string>;
        };

        setPlanId(saved.id);
        // Restore the strategy, but keep the builder ready for a different business.
        setForm({ ...initialForm, tone: "", resources: "", performance: "" });
        if (plan.strategy) {
          setStrategy({
            ...plan.strategy,
            first_steps: (plan.strategy.first_steps ?? []).map((item: string) =>
              item.replace(/^\s*\d+[.)]\s*/, ""),
            ),
          });
        }
        if (plan.taskStatuses) setTaskStatuses(plan.taskStatuses);
        setSaveMessage("Saved plan restored");
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load your saved plan.",
          );
        }
      }
    }

    void loadSavedPlan();
    return () => {
      active = false;
    };
  }, []);

  async function persistPlan(
    nextStrategy: Strategy,
    nextStatuses: Record<string, string>,
    nextForm = form,
    targetPlanId: string | null = planId,
  ) {
    setSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/smm/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetPlanId,
          title: `${nextForm.brand || "Brand"} content strategy`,
          plan: {
            form: nextForm,
            strategy: nextStrategy,
            taskStatuses: nextStatuses,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save your plan.");
      }

      setPlanId(data.savedPlan.id);
      setSaveMessage("All changes saved");
      return true;
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? `Save failed: ${err.message}` : "Save failed.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  function deleteArchivedPlan(id: string, title: string) {
    setPendingDeletePlan({ id, title });
  }

  async function confirmDeleteArchivedPlan() {
    if (!pendingDeletePlan || deletingPlanId) return;

    const { id } = pendingDeletePlan;
    setDeletingPlanId(id);
    setError("");

    try {
      const response = await fetch("/api/smm/plans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete this strategy.");
      }

      setArchivedPlans((previous) => previous.filter((item) => item.id !== id));

      if (planId === id) {
        setPlanId(null);
        setSaveMessage("This archived strategy was deleted. The displayed copy is no longer saved.");
      }

      setPendingDeletePlan(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete this strategy.",
      );
    } finally {
      setDeletingPlanId(null);
    }
  }

  async function updateTaskStatus(index: number, status: string) {
    if (!strategy) return;

    const item = strategy.weekly_plan[index];
    if (!item) return;

    const key = `${item.day}-${index}`;
    const nextStatuses = { ...taskStatuses, [key]: status };

    setTaskStatuses(nextStatuses);
    await persistPlan(strategy, nextStatuses);
  }

  function update(field: keyof typeof initialForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function generateStrategy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/smm/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not generate your strategy.");
      }

      const generated = data.strategy as Strategy;
      const initialStatuses = Object.fromEntries(
        generated.weekly_plan.map((item, index) => [
          `${item.day}-${index}`,
          "planned",
        ]),
      );

      const displayStrategy = {
        ...generated,
        first_steps: (generated.first_steps ?? []).map((item: string) =>
          item.replace(/^\s*\d+[.)]\s*/, ""),
        ),
      };

      // Save as a new row (null ID), which archives the previous active strategy.
      const saved = await persistPlan(generated, initialStatuses, form, null);
      setStrategy(displayStrategy);
      setTaskStatuses(initialStatuses);

      if (saved) {
        // Clear text fields only after the new strategy has been saved successfully.
        setForm({ ...initialForm, tone: "", resources: "", performance: "" });

        const archiveResponse = await fetch("/api/smm/plans");
        if (archiveResponse.ok) {
          const archiveData = await archiveResponse.json();
          setArchivedPlans(archiveData.archivedPlans ?? []);
        }
      } else {
        setError("Your strategy was generated, but saving failed. Your form has been kept so you can retry.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#090a12] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400";
  const labelClass = "text-sm font-medium text-zinc-300";

  return (
    <main className="min-h-screen bg-[#090a12] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <a href="/" className="text-lg font-bold tracking-tight">
            REEL <span className="text-lime-400">DNA</span>
          </a>
          <a
            href="/dashboard/smm/brand-intelligence"
            className="rounded-full border border-lime-400/30 px-4 py-2 text-sm text-lime-300 transition hover:bg-lime-400/10"
          >
            Brand Intelligence ↗
          </a>
          <a
            href="/dashboard/reels"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-lime-400 hover:text-white"
          >
            Video analysis ↗
          </a>
        </header>

        <section className="grid gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/5 px-3 py-1.5 text-xs font-medium text-lime-300">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
              AI-POWERED MARKETING
            </div>
            <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Your brand.
              <br />
              Your strategy.
              <br />
              <span className="text-lime-400">More intention.</span>
            </h1>
            <p className="mt-6 max-w-lg leading-7 text-zinc-400">
              Build a social media strategy tailored to your brand. Get content
              pillars, a seven-day publishing plan, ready-to-use hooks and
              measurable next steps.
            </p>

            <div className="mt-9 space-y-4">
              {[
                ["01", "Brand positioning", "Clarify what makes your brand different."],
                ["02", "Content direction", "Turn your goals into specific content ideas."],
                ["03", "Growth framework", "Know what to publish and what to measure."],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-4 border-t border-white/10 pt-4">
                  <span className="pt-0.5 text-sm text-lime-400">{number}</span>
                  <div>
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rdna-card p-5 sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-lime-400">
                Strategy builder
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Tell us about your brand</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                The more specific your inputs, the more relevant your strategy.
              </p>
            </div>

            <form onSubmit={generateStrategy} className="space-y-5">
              <div>
                <label htmlFor="brand" className={labelClass}>Brand name</label>
                <input
                  id="brand"
                  required
                  maxLength={200}
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}

                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="product" className={labelClass}>Product or service</label>
                <textarea
                  id="product"
                  required
                  maxLength={500}
                  rows={3}
                  value={form.product}
                  onChange={(e) => update("product", e.target.value)}

                  className={inputClass + " resize-y"}
                />
              </div>

              <div>
                <label htmlFor="audience" className={labelClass}>Target audience</label>
                <textarea
                  id="audience"
                  required
                  maxLength={500}
                  rows={2}
                  value={form.audience}
                  onChange={(e) => update("audience", e.target.value)}

                  className={inputClass + " resize-y"}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="platform" className={labelClass}>Platform</label>
                  <select
                    id="platform"
                    value={form.platform}
                    onChange={(e) => update("platform", e.target.value)}
                    className={inputClass}
                  >
                    <option>Instagram</option>
                    <option>TikTok</option>
                    <option>Facebook</option>
                    <option>Instagram + TikTok</option>
                    <option>All platforms</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="goal" className={labelClass}>Main goal</label>
                  <select
                    id="goal"
                    value={form.goal}
                    onChange={(e) => update("goal", e.target.value)}
                    className={inputClass}
                  >
                    <option value="sales">Increase sales</option>
                    <option value="growth">Grow the audience</option>
                    <option value="engagement">Increase engagement</option>
                    <option value="awareness">Build brand awareness</option>
                    <option value="leads">Generate leads</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="tone" className={labelClass}>Brand voice</label>
                <input
                  id="tone"
                  maxLength={200}
                  value={form.tone}
                  onChange={(e) => update("tone", e.target.value)}

                  className={inputClass}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="cadence" className={labelClass}>Publishing frequency</label>
                  <select id="cadence" value={form.cadence} onChange={(e) => update("cadence", e.target.value)} className={inputClass}>
                    <option>3 posts/week</option>
                    <option>4 posts/week</option>
                    <option>5 posts/week</option>
                    <option>Daily</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="hoursPerWeek" className={labelClass}>Time available per week</label>
                  <select id="hoursPerWeek" value={form.hoursPerWeek} onChange={(e) => update("hoursPerWeek", e.target.value)} className={inputClass}>
                    <option>Under 2 hours</option>
                    <option>2–3 hours</option>
                    <option>3–5 hours</option>
                    <option>5–8 hours</option>
                    <option>8+ hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="resources" className={labelClass}>Content resources and constraints</label>
                <textarea id="resources" maxLength={500} rows={2} value={form.resources} onChange={(e) => update("resources", e.target.value)} className={inputClass + " resize-y"} />
              </div>

              <div>
                <label htmlFor="performance" className={labelClass}>Previous content results (optional)</label>
                <textarea id="performance" maxLength={1000} rows={2} value={form.performance} onChange={(e) => update("performance", e.target.value)} className={inputClass + " resize-y"} />
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="rdna-button-primary flex w-full px-5 py-4 disabled:cursor-wait"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    Building your strategy…
                  </>
                ) : (
                  <>Generate my strategy <span aria-hidden="true">↗</span></>
                )}
              </button>
              <p className="text-center text-xs text-zinc-600">
                AI-generated recommendations · No guaranteed results
              </p>
            </form>
          </div>
        </section>

        {archivedPlans.length > 0 && (
          <section className="border-t border-white/10 py-8">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-lime-400">Your saved work</p>
              <h2 className="mt-2 text-2xl font-semibold">Strategy archive</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Archived strategies are stored indefinitely.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {archivedPlans.map((item) => {
                const savedStrategy = item.plan?.strategy;

                return (
                  <article key={item.id} className="relative rounded-2xl border border-white/10 bg-[#11141f] p-5">
                    <button
                      type="button"
                      onClick={() => void deleteArchivedPlan(item.id, item.title)}
                      disabled={deletingPlanId === item.id}
                      aria-label={`Delete ${item.title}`}
                      title="Delete archived strategy"
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-lg text-zinc-400 transition hover:border-red-400/50 hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deletingPlanId === item.id ? "…" : "×"}
                    </button>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-xs text-zinc-500">
                      Archived {item.archived_at ? new Date(item.archived_at).toLocaleString() : "recently"}
                    </p>
                    {savedStrategy && (
                      <p className="mt-3 line-clamp-2 text-sm text-zinc-400">
                        {savedStrategy.positioning}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!savedStrategy) {
                          setError("This archived item does not contain a readable strategy.");
                          return;
                        }
                        setPlanId(item.id);
                        setStrategy({
                          ...savedStrategy,
                          first_steps: (savedStrategy.first_steps ?? []).map((step: string) =>
                            step.replace(/^\s*\d+[.)]\s*/, ""),
                          ),
                        });
                        setTaskStatuses(item.plan.taskStatuses ?? {});
                        setForm({ ...initialForm, tone: "", resources: "", performance: "" });
                        setError("");
                        setSaveMessage("Archived strategy opened");
                        document.getElementById("strategy-results")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="mt-4 rounded-full border border-lime-400/40 px-4 py-2 text-sm text-lime-300 transition hover:bg-lime-400/10"
                    >
                      Open strategy
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {strategy && (
          <section id="strategy-results" className="space-y-8 border-t border-white/10 py-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-lime-400">Your custom plan</p>
                <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">The strategy</h2>
                <p className="mt-2 text-sm text-white/45">
                  {strategyCollapsed ? "Strategy collapsed" : "Full strategy is open"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <p role="status" className="mr-2 text-sm text-neutral-400">
                  {saving ? "Saving…" : saveMessage}
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm hover:border-lime-400"
                >
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setStrategyCollapsed((current) => !current)}
                  aria-expanded={!strategyCollapsed}
                  aria-controls="strategy-content"
                  className="rounded-full border border-white/10 bg-[#11141f] px-4 py-2 text-sm text-white/75 transition hover:border-lime-400/50 hover:text-white"
                >
                  {strategyCollapsed ? "Expand strategy ↑" : "Collapse strategy ↓"}
                </button>
              </div>
            </div>

            {!strategyCollapsed && (
              <div id="strategy-content" className="space-y-8">
                <div className="grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-[#11141f] p-6">
                <p className="text-xs uppercase tracking-widest text-lime-400">Positioning</p>
                <p className="mt-3 leading-7 text-zinc-200">{strategy.positioning}</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#11141f] p-6">
                <p className="text-xs uppercase tracking-widest text-lime-400">Audience insight</p>
                <p className="mt-3 leading-7 text-zinc-200">{strategy.audience_insight}</p>
              </article>
            </div>

            <div>
              <h3 className="mb-4 text-2xl font-semibold">Content pillars</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {strategy.content_pillars?.map((pillar, index) => (
                  <article key={`${pillar.name}-${index}`} className="rounded-2xl border border-white/10 bg-[#11141f] p-5">
                    <span className="text-xs text-lime-400">PILLAR {String(index + 1).padStart(2, "0")}</span>
                    <h4 className="mt-3 font-semibold">{pillar.name}</h4>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{pillar.purpose}</p>
                    <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {pillar.ideas?.map((idea, i) => (
                        <li key={i} className="text-sm leading-5 text-zinc-300">• {idea}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold">Content Calendar</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Manage each content task directly from its card.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!googleConnected ? (
                      <button
                        type="button"
                        onClick={() => { window.location.href = "/api/google-calendar/connect"; }}
                        disabled={googleCalendarBusy}
                        className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        Connect Google Calendar
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={syncGoogleCalendar}
                          disabled={googleCalendarBusy || !planId || !strategy}
                          className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {googleCalendarBusy ? "Please wait..." : "Sync to Google Calendar"}
                        </button>
                        <button
                          type="button"
                          onClick={disconnectGoogleCalendar}
                          disabled={googleCalendarBusy}
                          className="rounded-xl border border-white/15 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      </>
                    )}
                  </div>
                  {googleCalendarMessage && (
                    <p role="status" className="mt-2 max-w-xl text-sm text-zinc-300">
                      {googleCalendarMessage}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                  <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-zinc-500" />Pending</span>
                  <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-400" />In progress</span>
                  <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400" />Completed</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
                {calendarDates.map((day, dayIndex) => {
                  const dayItems = (strategy.weekly_plan ?? [])
                    .map((item, index) => ({ item, index }))
                    .filter(({ index }) => {
                      const taskCount = strategy.weekly_plan?.length ?? 0;
                      const dayOffset =
                        taskCount <= 1
                          ? 0
                          : Math.round(index * 6 / (taskCount - 1));
                      const scheduledDate = getEdmontonDateOffset(dayOffset);

                      return scheduledDate === day.isoDate;
                    });

                  return (
                    <section
                      key={day.label}
                      className={`min-w-0 rounded-2xl border p-3 transition-colors ${
                        day.isToday
                          ? "border-lime-400/70 bg-lime-400/[0.06] shadow-[0_0_20px_rgba(163,230,53,0.06)]"
                          : "border-white/10 bg-[#0d1019]"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <h4 className={`font-semibold ${day.isToday ? "text-lime-300" : "text-zinc-100"}`}>
                            {day.label}
                          </h4>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] tracking-widest text-zinc-500">
                              {day.short}
                            </span>
                            <span className={`text-xs ${day.isToday ? "font-semibold text-lime-300" : "text-zinc-400"}`}>
                              {day.dateLabel}
                            </span>
                            {day.isToday && (
                              <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-lime-300">
                                TODAY
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-400">
                          {dayItems.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {dayItems.length === 0 ? (
                          <p className="py-3 text-xs text-zinc-600">No tasks scheduled</p>
                        ) : (
                          dayItems.map(({ item, index }) => {
                            const key = `${item.day}-${index}`;
                            const currentStatus = taskStatuses[key] || "planned";
                            const statuses = [
                              { value: "planned", label: "Pending" },
                              { value: "in progress", label: "In progress" },
                              { value: "done", label: "Completed" },
                            ] as const;

                            return (
                              <article
                                key={key}
                                role="button"
                                tabIndex={0}
                                aria-label={`Open full brief: ${item.topic}`}
                                onClick={() => setSelectedTaskIndex(index)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setSelectedTaskIndex(index);
                                  }
                                }}
                                className="cursor-pointer rounded-xl border border-white/10 bg-[#151925] p-3 transition hover:border-lime-400/50 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                              >
                                {(() => {
                                  const format = item.format || "Content";
                                  const normalized = format.toLowerCase();
                                  const badge =
                                    /reel|video|short|tiktok/.test(normalized)
                                      ? {
                                          label: format,
                                          icon: "▶",
                                          style: "border-pink-400/30 bg-pink-400/15 text-pink-300",
                                        }
                                      : /story|stories/.test(normalized)
                                        ? {
                                            label: format,
                                            icon: "◉",
                                            style: "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
                                          }
                                        : /carousel|slide/.test(normalized)
                                          ? {
                                              label: format,
                                              icon: "▧",
                                              style: "border-sky-400/30 bg-sky-400/15 text-sky-300",
                                            }
                                          : /engage|poll|question|community|interactive/.test(normalized)
                                            ? {
                                                label: format,
                                                icon: "✳",
                                                style: "border-amber-400/30 bg-amber-400/15 text-amber-300",
                                              }
                                            : /live/.test(normalized)
                                              ? {
                                                  label: format,
                                                  icon: "◉",
                                                  style: "border-violet-400/30 bg-violet-400/15 text-violet-300",
                                                }
                                              : {
                                                  label: format,
                                                  icon: "✦",
                                                  style: "border-lime-400/30 bg-lime-400/15 text-lime-300",
                                                };

                                  return (
                                    <div className="mb-3">
                                      <span
                                        className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badge.style}`}
                                      >
                                        <span aria-hidden="true">{badge.icon}</span>
                                        <span className="break-words">{badge.label}</span>
                                      </span>
                                    </div>
                                  );
                                })()}

                                <h5 className="mt-2 break-words text-sm font-semibold leading-5 text-zinc-100">
                                  {item.topic}
                                </h5>

                                <div className="mt-3 flex flex-col gap-1.5">
                                  {statuses.map((status) => {
                                    const selected = currentStatus === status.value;
                                    const selectedStyle =
                                      status.value === "done"
                                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                                        : status.value === "in progress"
                                          ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                                          : "border-zinc-500/60 bg-zinc-500/10 text-zinc-200";

                                    return (
                                      <button
                                        key={status.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void updateTaskStatus(index, status.value);
                                        }}
                                        className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                                          selected
                                            ? selectedStyle
                                            : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-zinc-300"
                                        }`}
                                      >
                                        <span className="mr-1.5">{selected ? "●" : "○"}</span>
                                        {status.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="mt-3 border-t border-white/10 pt-3 text-xs font-medium text-lime-300">
                                  Open full brief <span aria-hidden="true">↗</span>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            {selectedTaskIndex !== null && strategy.weekly_plan?.[selectedTaskIndex] && (() => {
              const task = strategy.weekly_plan[selectedTaskIndex];
              const taskKey = `${task.day}-${selectedTaskIndex}`;
              const currentStatus = taskStatuses[taskKey] || "planned";
              const taskStatusesOptions = [
                { value: "planned", label: "Pending" },
                { value: "in progress", label: "In progress" },
                { value: "done", label: "Completed" },
              ] as const;

              return (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setSelectedTaskIndex(null);
                  }}
                >
                  <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="task-brief-title"
                    className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#10131d] shadow-2xl sm:rounded-3xl"
                  >
                    <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8 sm:py-6">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">
                          {task.format} · {task.day}
                        </p>
                        <h2 id="task-brief-title" className="mt-2 break-words text-2xl font-semibold text-white sm:text-3xl">
                          {task.topic}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-400">Complete content brief</p>
                      </div>
                      <button
                        type="button"
                        autoFocus
                        onClick={() => setSelectedTaskIndex(null)}
                        aria-label="Close task brief"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-2xl text-zinc-300 transition hover:border-lime-400/60 hover:text-white"
                      >
                        ×
                      </button>
                    </header>

                    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-lime-300">Hook</h3>
                        <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-zinc-200">{task.hook || "Not specified"}</p>
                      </div>

                      {task.objective && (
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-lime-300">Purpose</h3>
                          <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-zinc-300">{task.objective}</p>
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-lime-300">Shot-by-shot plan</h3>
                        {task.shot_list && task.shot_list.length > 0 ? (
                          <ol className="mt-3 space-y-3">
                            {task.shot_list.map((shot, shotIndex) => (
                              <li key={shotIndex} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-sm font-semibold text-lime-300">
                                  {shotIndex + 1}
                                </span>
                                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">{shot}</p>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="mt-2 text-sm text-zinc-500">No shot-by-shot plan provided.</p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-lime-300">Call to action (CTA)</h3>
                        <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-zinc-200">{task.cta || "Not specified"}</p>
                      </div>

                      <div className="border-t border-white/10 pt-5">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Task status</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {taskStatusesOptions.map((status) => {
                            const selected = currentStatus === status.value;
                            const style = status.value === "done"
                              ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                              : status.value === "in progress"
                                ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                                : "border-zinc-500/60 bg-zinc-500/10 text-zinc-200";

                            return (
                              <button
                                key={status.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => void updateTaskStatus(selectedTaskIndex, status.value)}
                                className={`rounded-full border px-4 py-2 text-sm transition ${
                                  selected ? style : "border-white/10 text-zinc-400 hover:border-white/30"
                                }`}
                              >
                                {selected ? "● " : ""}{status.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <footer className="flex justify-end border-t border-white/10 px-5 py-4 sm:px-8">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskIndex(null)}
                        className="rounded-full bg-lime-300 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200"
                      >
                        Close brief
                      </button>
                    </footer>
                  </section>
                </div>
              );
            })()}

            <div className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-[#11141f] p-6">
                <h3 className="text-lg font-semibold">Growth actions</h3>
                <ul className="mt-4 space-y-3">
                  {strategy.growth_actions?.map((item, i) => (
                    <li key={i} className="text-sm leading-6 text-zinc-300">↗ {item}</li>
                  ))}
                </ul>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#11141f] p-6">
                <h3 className="text-lg font-semibold">Success metrics</h3>
                <ul className="mt-4 space-y-4">
                  {strategy.success_metrics?.map((item, i) => (
                    <li key={i}>
                      <p className="text-sm font-medium text-lime-300">{item.metric}</p>
                      <p className="mt-1 text-sm text-zinc-400">{item.why}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{item.review}</p>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-full border border-lime-400/20 bg-lime-400/[0.04] p-6">
                <h3 className="text-lg font-semibold">Start today</h3>
                <ol className="mt-4 list-none space-y-3">
                  {strategy.first_steps?.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-6 text-zinc-300">
                      <span className="text-lime-400">{i + 1}.</span>
                      {item.replace(/^\s*\d+[.)]\s*/, "")}
                    </li>
                  ))}
                </ol>
              </article>
            </div>
                </div>
            )}
          </section>
        )}

        {pendingDeletePlan && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !deletingPlanId) {
                setPendingDeletePlan(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-strategy-title"
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#11141f] shadow-2xl shadow-black/50"
            >
              <div className="p-6 sm:p-7">
                <button
                  type="button"
                  aria-label="Close delete confirmation"
                  disabled={Boolean(deletingPlanId)}
                  onClick={() => setPendingDeletePlan(null)}
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.08] text-xl text-red-300 transition hover:border-red-300/40 hover:bg-red-400/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ×
                </button>

                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-400">
                  Strategy archive
                </p>
                <h2 id="delete-strategy-title" className="mt-2 text-xl font-semibold tracking-tight text-white">
                  Delete this strategy?
                </h2>
                <p className="mt-3 break-words text-sm leading-6 text-zinc-400">
                  You are about to permanently delete{" "}
                  <span className="font-medium text-zinc-200">
                    “{pendingDeletePlan.title}”
                  </span>
                  . This action cannot be undone.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-black/10 p-5 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  disabled={Boolean(deletingPlanId)}
                  onClick={() => setPendingDeletePlan(null)}
                  className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.04] disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingPlanId)}
                  onClick={() => void confirmDeleteArchivedPlan()}
                  className="rounded-full border border-red-400/30 bg-red-400/10 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:border-red-300/50 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingPlanId ? "Deleting…" : "Delete strategy"}
                </button>
              </div>
            </section>
          </div>
        )}

        <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-600">
          REEL DNA · Strategy built for your brand
        </footer>
      </div>
    </main>
  );
}
