import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const brand = String(input.brand ?? "").trim().slice(0, 200);
    const product = String(input.product ?? "").trim().slice(0, 500);
    const audience = String(input.audience ?? "").trim().slice(0, 500);
    const goal = String(input.goal ?? "sales").trim().slice(0, 100);
    const platform = String(input.platform ?? "Instagram").trim().slice(0, 100);
    const tone = String(input.tone ?? "warm and authentic").trim().slice(0, 200);
    const cadence = String(input.cadence ?? "3 posts/week").trim().slice(0, 50);
    const hoursPerWeek = String(input.hoursPerWeek ?? "3–5 hours").trim().slice(0, 50);
    const resources = String(input.resources ?? "").trim().slice(0, 500);
    const performance = String(input.performance ?? "").trim().slice(0, 1000);
    const cadenceMatch = cadence.match(/^(3|4|5) posts\/week$/);
    const weeklyCount = cadence === "Daily" ? 7 : cadenceMatch ? Number(cadenceMatch[1]) : 3;

    if (!brand || !product || !audience) {
      return NextResponse.json(
        { error: "Brand, product and target audience are required." },
        { status: 400 },
      );
    }

    const prompt = `Act as a senior social media strategist who creates practical, evidence-aware content plans for real businesses.
Create a specific strategy using these inputs.

BRAND CONTEXT
Brand: ${brand}
Product/service: ${product}
Target audience: ${audience}
Primary goal: ${goal}
Platform(s): ${platform}
Brand voice: ${tone}

REAL-WORLD CONSTRAINTS
Publishing frequency: ${cadence} (${weeklyCount} planned posts this week)
Time available: ${hoursPerWeek}
Resources and constraints: ${resources || "Not provided. Use realistic, low-cost assumptions."}
Previous performance data: ${performance || "Not provided. Do not invent results or assume past performance."}

Requirements:
- Make every recommendation specific to the product, audience, goal, platform and voice. Avoid generic advice that could fit any brand.
- Create exactly ${weeklyCount} posts, not seven compulsory posts. Spread them across distinct, realistic days.
- Respect the time and resources available. Do not assume a team, paid ads, professional equipment, customer footage or a website unless stated.
- Every post must include a practical sequence of 3–5 shots or slides, describing exactly what to film or show in order.
- Every post needs an objective tied to the goal, a strong platform-appropriate hook, a specific topic and a natural CTA. Avoid repetitive ideas.
- Keep advice feasible and actionable. Do not invent analytics, audience demographics, baselines or results, and never guarantee outcomes.
- If performance data is supplied, distinguish evidence from hypotheses. If not supplied, explain what to track first to establish a baseline.
- Use the brand's language and voice for creative hooks where possible.

Return valid JSON only with exactly this structure:
{
 "positioning":"2 concise, brand-specific sentences",
 "audience_insight":"2 concise sentences; label hypotheses as hypotheses",
 "content_pillars":[
  {"name":"short name","purpose":"one sentence tied to the goal","ideas":["specific idea 1","specific idea 2","specific idea 3"]}
 ],
 "weekly_plan":[
  {"day":"day of week","format":"Reel, Story, Carousel or Post","topic":"specific concept","hook":"opening hook","cta":"specific call to action","objective":"intended outcome","shot_list":["first shot or slide","second shot or slide","third shot or slide"]}
 ],
 "growth_actions":["specific feasible action 1","specific feasible action 2","specific feasible action 3"],
 "success_metrics":[
  {"metric":"metric name","why":"why it matters for this goal","review":"how and when to review without inventing a baseline"}
 ],
 "first_steps":["concrete step 1","concrete step 2","concrete step 3"]
}
Requirements: exactly 4 content pillars, exactly ${weeklyCount} weekly_plan entries, exactly 3 growth_actions, exactly 3 success_metrics and exactly 3 first_steps. Valid JSON only, no markdown.`;

    const startedAt = Date.now();
    console.info("[SMM] Starting Anthropic request");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    let response: Response;

    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      console.error(
        `[SMM] Anthropic request failed after ${Date.now() - startedAt}ms`,
        error instanceof Error ? error.name : "Unknown error",
      );

      if (controller.signal.aborted) {
        return NextResponse.json(
          { error: "The AI is taking too long. Please try again." },
          { status: 504 },
        );
      }

      return NextResponse.json(
        { error: "Could not connect to the AI provider. Please try again." },
        { status: 502 },
      );
    } finally {
      clearTimeout(timeout);
    }

    console.info(`[SMM] Anthropic responded in ${Date.now() - startedAt}ms with HTTP ${response.status}`);

    const rawResponse = await response.text();

    if (!response.ok) {
      console.error("[SMM] Provider error:", response.status, rawResponse.slice(0, 300));

      return NextResponse.json(
        {
          error:
            response.status === 429
              ? "The AI provider is rate-limiting requests. Please wait and retry."
              : `AI provider returned HTTP ${response.status}. Please try again.`,
        },
        { status: 502 },
      );
    }

    let providerResult: {
      content?: Array<{ type?: string; text?: string }>;
      stop_reason?: string | null;
    };

    try {
      providerResult = JSON.parse(rawResponse);
    } catch {
      return NextResponse.json(
        { error: "The AI provider returned an invalid response." },
        { status: 502 },
      );
    }

    const rawText = providerResult.content
      ?.find((item) => item.type === "text")
      ?.text;

    if (!rawText) {
      return NextResponse.json(
        { error: "The AI returned an empty response. Please retry." },
        { status: 502 },
      );
    }

    if (providerResult.stop_reason === "max_tokens") {
      console.error("[SMM] AI response was truncated at the token limit.");
      return NextResponse.json(
        { error: "The AI response was cut off before completion. Please retry." },
        { status: 502 },
      );
    }

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      const strategy = JSON.parse(cleaned) as {
        weekly_plan?: Array<Record<string, unknown>>;
      };

      const weeklyPlan = strategy.weekly_plan;

      if (!Array.isArray(weeklyPlan)) {
        return NextResponse.json(
          { error: "The AI returned a strategy without a valid weekly plan." },
          { status: 502 },
        );
      }

      const taskCount = weeklyPlan.length;

      strategy.weekly_plan = weeklyPlan.map((task, index) => ({
        ...task,
        scheduled_date: getEdmontonDateOffset(
          taskCount <= 1 ? 0 : Math.round(index * 6 / (taskCount - 1)),
        ),
      }));

      console.info(`[SMM] Strategy completed in ${Date.now() - startedAt}ms`);
      return NextResponse.json({ strategy });
    } catch {
      console.error("[SMM] AI response was not valid JSON:", cleaned.slice(0, 300));
      return NextResponse.json(
        { error: "The AI returned an incomplete strategy. Please retry." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("[SMM] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unable to generate the strategy right now." },
      { status: 500 },
    );
  }
}
