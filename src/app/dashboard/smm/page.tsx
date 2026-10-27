"use client";

import { useState } from "react";

type Strategy = {
  positioning: string;
  audience_insight: string;
  content_pillars: { name: string; purpose: string; ideas: string[] }[];
  weekly_plan: {
    day: string;
    format: string;
    topic: string;
    hook: string;
    cta: string;
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
};

export default function SMMStudioPage() {
  const [form, setForm] = useState(initialForm);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof typeof initialForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function generateStrategy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStrategy(null);

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

      setStrategy(data.strategy as Strategy);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#111512] px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-400";
  const labelClass = "text-sm font-medium text-neutral-300";

  return (
    <main className="min-h-screen bg-[#090b09] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <a href="/" className="text-lg font-bold tracking-tight">
            REEL <span className="text-lime-400">DNA</span>
          </a>
          <a
            href="/dashboard/reels"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-neutral-300 transition hover:border-lime-400 hover:text-white"
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
            <p className="mt-6 max-w-lg leading-7 text-neutral-400">
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
                    <p className="mt-1 text-sm text-neutral-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#101310] p-5 sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-lime-400">
                Strategy builder
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Tell us about your brand</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
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
                  placeholder="e.g. OJ•M Lumière"
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
                  placeholder="What do you sell? What makes it special?"
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
                  placeholder="Who are your ideal customers?"
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
                  placeholder="e.g. Minimalist, playful, premium"
                  className={inputClass}
                />
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-lime-400 px-5 py-4 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-wait disabled:opacity-60"
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
              <p className="text-center text-xs text-neutral-600">
                AI-generated recommendations · No guaranteed results
              </p>
            </form>
          </div>
        </section>

        {strategy && (
          <section id="strategy-results" className="space-y-8 border-t border-white/10 py-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-lime-400">Your custom plan</p>
                <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">The strategy</h2>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-lime-400"
              >
                Print / Save PDF
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-[#101310] p-6">
                <p className="text-xs uppercase tracking-widest text-lime-400">Positioning</p>
                <p className="mt-3 leading-7 text-neutral-200">{strategy.positioning}</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#101310] p-6">
                <p className="text-xs uppercase tracking-widest text-lime-400">Audience insight</p>
                <p className="mt-3 leading-7 text-neutral-200">{strategy.audience_insight}</p>
              </article>
            </div>

            <div>
              <h3 className="mb-4 text-2xl font-semibold">Content pillars</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {strategy.content_pillars?.map((pillar, index) => (
                  <article key={`${pillar.name}-${index}`} className="rounded-2xl border border-white/10 bg-[#101310] p-5">
                    <span className="text-xs text-lime-400">PILLAR {String(index + 1).padStart(2, "0")}</span>
                    <h4 className="mt-3 font-semibold">{pillar.name}</h4>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">{pillar.purpose}</p>
                    <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {pillar.ideas?.map((idea, i) => (
                        <li key={i} className="text-sm leading-5 text-neutral-300">• {idea}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-2xl font-semibold">Your 7-day content plan</h3>
              <div className="space-y-3">
                {strategy.weekly_plan?.map((item, index) => (
                  <article key={`${item.day}-${index}`} className="grid gap-3 rounded-2xl border border-white/10 bg-[#101310] p-5 md:grid-cols-[100px_120px_1fr]">
                    <div>
                      <p className="font-semibold">{item.day}</p>
                      <p className="mt-1 text-xs text-lime-400">{item.format}</p>
                    </div>
                    <div className="text-sm text-neutral-300">{item.topic}</div>
                    <div className="space-y-2 text-sm">
                      <p className="leading-6 text-neutral-300">“{item.hook}”</p>
                      <p className="text-neutral-500">CTA: {item.cta}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-[#101310] p-6">
                <h3 className="text-lg font-semibold">Growth actions</h3>
                <ul className="mt-4 space-y-3">
                  {strategy.growth_actions?.map((item, i) => (
                    <li key={i} className="text-sm leading-6 text-neutral-300">↗ {item}</li>
                  ))}
                </ul>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#101310] p-6">
                <h3 className="text-lg font-semibold">Success metrics</h3>
                <ul className="mt-4 space-y-4">
                  {strategy.success_metrics?.map((item, i) => (
                    <li key={i}>
                      <p className="text-sm font-medium text-lime-300">{item.metric}</p>
                      <p className="mt-1 text-sm text-neutral-400">{item.why}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{item.review}</p>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.04] p-6">
                <h3 className="text-lg font-semibold">Start today</h3>
                <ol className="mt-4 space-y-3">
                  {strategy.first_steps?.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-6 text-neutral-300">
                      <span className="text-lime-400">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </article>
            </div>
          </section>
        )}

        <footer className="border-t border-white/10 py-6 text-center text-xs text-neutral-600">
          REEL DNA · Strategy built for your brand
        </footer>
      </div>
    </main>
  );
}
