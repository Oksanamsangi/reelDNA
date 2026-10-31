
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const features = [
  {
    number: "01",
    title: "Deep Video Analysis",
    description:
      "Analyze your hook, visual storytelling, pacing, composition, and on-screen text.",
  },
  {
    number: "02",
    title: "Actionable Recommendations",
    description:
      "Get clear, practical suggestions to improve your Reels before publishing.",
  },
  {
    number: "03",
    title: "Technical Quality Check",
    description:
      "Review video quality, framing, lighting, and other technical issues.",
  },
  {
    number: "04",
    title: "Content Intelligence",
    description:
      "Discover strengths, identify weaknesses, and find opportunities to improve.",
  },
];

const bars = [24, 43, 34, 58, 40, 67, 48];




function FloatingOverlay() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % 3);
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  const cards = [
    {
      title: "Visual storytelling",
      label: "OVERLAY INFO",
      badge: "AI SCAN",
      description:
        "Check framing, lighting and visual consistency throughout your Reel.",
      footer: "78% visual consistency",
    },
    {
      title: "Opening seconds",
      label: "HOOK ANALYSIS",
      badge: "01",
      description:
        "Evaluate whether the first frame earns attention and creates curiosity.",
      footer: "FIRST IMPRESSION",
    },
    {
      title: "Improve pacing",
      label: "NEXT STEP",
      badge: "02",
      description:
        "Remove slow moments, tighten transitions and keep each shot purposeful.",
      footer: "ACTIONABLE TIP",
    },
  ];

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-4 z-20 h-[164px] overflow-hidden"
      aria-label="AI insight cards carousel"
    >
      {cards.map((card, index) => {
        const position = (index - activeIndex + 3) % 3;
        const isActive = position === 0;
        const left = position === 0 ? "50%" : position === 1 ? "83%" : "17%";

        return (
          <div
            key={card.label}
            className={`absolute top-2 box-border h-[148px] overflow-hidden rounded-2xl border p-3 shadow-2xl backdrop-blur-md transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-4 ${
              isActive
                ? "border-lime-400/40 bg-[#1b2028] opacity-100 shadow-lime-400/10"
                : "border-white/10 bg-[#171923]/95 opacity-65"
            }`}
            style={{
              left,
              width: "clamp(145px, 32%, 220px)",
              transform: `translateX(-50%) scale(${isActive ? 1.11 : 0.88})`,
              zIndex: isActive ? 3 : 1,
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <p
                className={`text-[9px] font-bold tracking-[0.08em] sm:text-[10px] ${
                  isActive ? "text-lime-300" : "text-zinc-400"
                }`}
              >
                {card.label}
              </p>
              <span className="shrink-0 rounded-full bg-lime-400/10 px-1.5 py-1 text-[8px] text-lime-300 sm:px-2 sm:text-[9px]">
                {card.badge}
              </span>
            </div>
            <p
              className={`mt-2 text-xs font-bold sm:text-sm ${
                index === 2 ? "text-lime-300" : "text-white"
              }`}
            >
              {card.title}
            </p>
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-400 sm:text-[11px]">
              {card.description}
            </p>
            <p className="mt-1 text-[8px] font-semibold tracking-wide text-lime-300 sm:text-[9px]">
              {card.footer}
            </p>
          </div>
        );
      })}
    </div>
  );
}


export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setIsLoggedIn(Boolean(data.user));
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setIsLoggedIn(Boolean(session?.user));
      setAuthChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090a12] text-white">
      <div className="pointer-events-none absolute -right-40 -top-48 h-[650px] w-[800px] rounded-full bg-lime-400/[0.07] blur-[150px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[700px] rounded-full bg-pink-500/[0.08] blur-[150px]" />

      <div className="relative mx-auto w-full max-w-[1600px] px-6 sm:px-10 lg:px-16 xl:px-20">
        <header className="flex h-[76px] items-center justify-between border-b border-white/[0.05]">
          <Link href="/" className="text-xl font-black tracking-tight">
            Reel<span className="text-lime-400">DNA</span>
          </Link>

          <nav className="hidden items-center gap-10 text-sm text-zinc-400 sm:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {authChecked && (
              isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-lime-400 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-lime-300"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold transition hover:border-lime-400/50 hover:text-lime-300"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full bg-lime-400 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-lime-300"
                  >
                    Sign up
                  </Link>
                </>
              )
            )}
          </div>
        </header>

        <section className="grid min-h-[570px] items-center gap-12 py-16 md:grid-cols-[1.1fr_0.9fr] lg:min-h-[650px] lg:gap-20 lg:py-24">
          <div className="max-w-[720px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
              AI-powered Reel analysis
            </div>

            <h1 className="text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl xl:text-[88px]">
              Make your Reels
              <br />
              <span className="text-lime-400">stand out.</span>
              <br />
              Know what to
              <br />
              improve.
            </h1>

            <p className="mt-7 max-w-[510px] text-base leading-7 text-zinc-400 lg:text-lg lg:leading-8">
              Get an AI-powered breakdown of your Instagram Reels, with
              actionable insights to help you create stronger videos.
            </p>

            <p className="mt-8 text-sm text-zinc-500">
              Create your account to unlock your personalized Reel insights.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {["Instagram Reels", "Visual AI", "Actionable insights"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-xs text-zinc-400"
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px] md:ml-auto md:mr-0">
            <div className="absolute inset-8 rounded-full bg-lime-400/10 blur-[90px]" />

            <div className="relative min-h-[680px] overflow-hidden rounded-3xl border border-white/[0.09] bg-[#121520] p-6 pb-[90px] shadow-2xl shadow-black/30 sm:p-8 sm:pb-[90px] lg:p-10 lg:pb-[90px]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-400">Your Reel overview</p>
                  <p className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                    AI <span className="text-lime-400">Insights</span>
                  </p>
                </div>
                <span className="rounded-full border border-lime-400/20 bg-lime-400/[0.08] px-3 py-1.5 text-[11px] text-lime-300">
                  Visual audit
                </span>
              </div>

              <div className="mt-8 rounded-2xl border border-white/[0.06] bg-[#0b0d15] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-400">
                    Sample performance chart
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Illustration
                  </span>
                </div>

                <div className="mt-6 flex h-[150px] items-end gap-2 sm:h-[190px] sm:gap-3">
                  {bars.map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-lg bg-lime-400/80 transition hover:bg-lime-300"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                <div className="mt-4 flex justify-between text-[11px] text-zinc-500">
                  <span>Start</span>
                  <span>Video timeline</span>
                  <span>End</span>
                </div>
              </div>

              <FloatingOverlay />
            </div>
          </div>
        </section>

        <section id="features" className="py-14 lg:py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Everything you need.
              <br className="hidden sm:block" />
              <span className="text-zinc-500"> Nothing you don&apos;t.</span>
            </h2>
            <p className="max-w-sm text-sm leading-6 text-zinc-400">
              One clear workflow to understand your video and make better
              creative decisions.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="min-h-[200px] rounded-2xl border border-white/[0.09] bg-[#11141f]/90 p-6 transition hover:-translate-y-1 hover:border-lime-400/30 lg:p-7"
              >
                <p className="text-[11px] font-bold tracking-wider text-lime-400">
                  {feature.number}
                </p>
                <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="mb-12 mt-8 flex flex-col gap-6 rounded-3xl border border-white/[0.09] bg-[#11141f]/90 p-7 sm:p-9 md:flex-row md:items-center md:justify-between lg:px-12 lg:py-10"
        >
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Ready to improve your Reels?
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Upload a video and get your visual analysis.
            </p>
          </div>

          {authChecked && (
            <Link
              href={isLoggedIn ? "/dashboard" : "/signup"}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-lime-400 px-7 py-3 text-sm font-bold text-[#090a12] transition hover:bg-lime-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#11141f]"
            >
              {isLoggedIn ? "Dashboard" : "Sign Up"}
            </Link>
          )}
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/[0.06] py-7 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Reel DNA</span>
          <span>Built for better Reels.</span>
        </footer>
      </div>
    </main>
  );
}
