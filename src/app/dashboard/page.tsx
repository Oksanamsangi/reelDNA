import Link from "next/link";

const tools = [
  {
    number: "01",
    eyebrow: "VIDEO PERFORMANCE",
    title: "Reels Analysis",
    description:
      "Understand your video's hook, pacing, visuals, and technical quality. Get practical recommendations before you publish.",
    href: "/dashboard/reels",
    action: "Analyze a Reel",
  },
  {
    number: "02",
    eyebrow: "CONTENT STRATEGY",
    title: "SMM Studio",
    description:
      "Build a content strategy with AI-powered ideas, recommendations, and tools for your social media presence.",
    href: "/dashboard/smm",
    action: "Open SMM Studio",
  },
  {
    number: "03",
    eyebrow: "BRAND AUDIT",
    title: "Brand Intelligence",
    description:
      "Review a public Instagram profile to uncover content patterns, strengths, weaknesses, and opportunities.",
    href: "/dashboard/smm/brand-intelligence",
    action: "Audit a Brand",
  },
];

export default function DashboardPage() {
  return (
    <main className="relative min-h-[calc(100vh-65px)] overflow-hidden bg-[#090a12] px-5 py-12 text-white sm:px-8 sm:py-16">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-lime-400/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-[#11141f]/80 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-lime-400/30 hover:text-lime-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
          >
            <span aria-hidden="true">←</span>
            Home
          </Link>
        </div>

        <div className="mb-10 max-w-3xl">
          <p className="text-xs font-bold tracking-[0.2em] text-lime-400">
            YOUR WORKSPACE
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Welcome to <span className="text-lime-400">Reel DNA.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            Choose a tool to analyze your videos, shape your content strategy,
            or understand a brand's Instagram presence.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {tools.map((tool) => (
            <article
              key={tool.number}
              className="group flex min-h-[310px] flex-col rounded-3xl border border-white/10 bg-[#11141f]/90 p-6 transition duration-300 hover:-translate-y-1 hover:border-lime-400/30 sm:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold tracking-[0.16em] text-lime-400">
                  {tool.eyebrow}
                </span>
                <span className="text-sm text-zinc-600">{tool.number}</span>
              </div>

              <h2 className="mt-8 text-2xl font-bold tracking-tight">
                {tool.title}
              </h2>
              <p className="mt-4 flex-1 text-sm leading-7 text-zinc-400">
                {tool.description}
              </p>

              <Link
                href={tool.href}
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-lime-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-lime-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#11141f]"
              >
                {tool.action}
                <span className="ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true">
                  →
                </span>
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-8 text-xs leading-6 text-zinc-500">
          Your tools are available from this dashboard whenever you need them.
        </p>
      </div>
    </main>
  );
}
