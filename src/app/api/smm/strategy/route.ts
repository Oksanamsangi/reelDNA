import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    if (!brand || !product || !audience) {
      return NextResponse.json(
        { error: "Brand, product and target audience are required." },
        { status: 400 },
      );
    }

    const prompt = `Act as a senior social media strategist.
Create a concise, specific strategy for:
Brand: ${brand}
Product: ${product}
Audience: ${audience}
Goal: ${goal}
Platform: ${platform}
Voice: ${tone}

Return valid JSON only. Use exactly this structure:
{
 "positioning":"2 concise sentences",
 "audience_insight":"2 concise sentences",
 "content_pillars":[
  {"name":"short name","purpose":"one sentence","ideas":["idea 1","idea 2","idea 3"]}
 ],
 "weekly_plan":[
  {"day":"Monday","format":"Reel or Story or Carousel or Post","topic":"specific topic","hook":"short opening hook","cta":"short call to action"}
 ],
 "growth_actions":["action 1","action 2","action 3"],
 "success_metrics":[
  {"metric":"name","why":"reason","review":"how to review"}
 ],
 "first_steps":["step 1","step 2","step 3"]
}
Requirements: exactly 4 content pillars, exactly 7 weekly plan entries for Monday through Sunday, 3 growth actions, 3 success metrics and 3 first steps. Be concise but actionable. Never invent current analytics or guarantee results. JSON only, no markdown.`;

    const startedAt = Date.now();
    console.info("[SMM] Starting Anthropic request");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

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
          max_tokens: 1800,
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

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      const strategy: unknown = JSON.parse(cleaned);
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
