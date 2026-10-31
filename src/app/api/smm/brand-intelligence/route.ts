import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

function getHandle(value: string) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Встав коректне посилання на Instagram-профіль.");
  }

  if (
    !["instagram.com", "www.instagram.com"].includes(
      url.hostname.toLowerCase()
    )
  ) {
    throw new Error("Потрібне посилання саме на instagram.com.");
  }

  const handle = url.pathname.split("/").filter(Boolean)[0];

  if (
    !handle ||
    ["p", "reel", "reels", "stories", "explore", "accounts"].includes(
      handle.toLowerCase()
    )
  ) {
    throw new Error("Встав посилання на профіль, а не на окремий Reel.");
  }

  return handle.replace(/^@/, "").toLowerCase();
}

async function scrapeInstagram(handle: string) {
  if (!APIFY_TOKEN) {
    throw new Error(
      "Не налаштований APIFY_API_TOKEN. Додай токен Apify у .env.local і перезапусти застосунок."
    );
  }

  const requests = [
    {
      actor: "apify~instagram-profile-scraper",
      input: { usernames: [handle] },
    },
    {
      actor: "apify~instagram-scraper",
      input: {
        directUrls: [`https://www.instagram.com/${handle}/`],
        resultsType: "posts",
        resultsLimit: 12,
      },
    },
  ];

  const results = await Promise.all(
    requests.map(async ({ actor, input }) => {
      const response = await fetch(
        `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY_TOKEN)}&timeout=100&memory=1024`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          cache: "no-store",
          signal: AbortSignal.timeout(105_000),
        }
      );

      if (!response.ok) {
        const details = (await response.text()).slice(0, 500);
        console.error(`[Brand Intelligence] ${actor}:`, details);
        throw new Error(
          "Не вдалося отримати дані Instagram через Apify. Перевір токен, доступ до сервісу та ліміти."
        );
      }

      return response.json();
    })
  );

  const profiles = Array.isArray(results[0]) ? results[0] : [];
  const rawPosts = Array.isArray(results[1]) ? results[1] : [];

  const profile = profiles[0] ?? null;

  const posts = rawPosts.slice(0, 12).map((post: Record<string, unknown>) => ({
    url: post.url ?? post.postUrl ?? null,
    caption: post.caption ?? post.text ?? "",
    timestamp: post.timestamp ?? post.takenAt ?? null,
    likes: post.likesCount ?? post.likes ?? null,
    comments: post.commentsCount ?? post.comments ?? null,
    views: post.videoPlayCount ?? post.videoViewCount ?? null,
    type: post.type ?? post.productType ?? null,
    hashtags: post.hashtags ?? [],
  }));

  if (!profile && posts.length === 0) {
    throw new Error(
      "Instagram не повернув даних. Перевір, чи профіль публічний, чи правильне посилання та чи підтримує його поточний доступ Apify."
    );
  }

  return { handle, profile, posts };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Увійди у свій акаунт." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("brand_intelligence")
    .select("profile_handle, profile_data, audit, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Brand Intelligence] Load failed:", error.message);
    return NextResponse.json(
      { error: "Не вдалося завантажити збережений аудит. Перевір міграцію Supabase." },
      { status: 500 }
    );
  }

  return NextResponse.json({ saved: data ?? null });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Увійди у свій акаунт." }, { status: 401 });
    }

    if (!ANTHROPIC_KEY) {
      return NextResponse.json(
        { error: "Не налаштований ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const profileUrl = String(body.profileUrl ?? "").trim();
    const handle = getHandle(profileUrl);

    const snapshot = await scrapeInstagram(handle);

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: `You are a senior Instagram growth strategist, brand positioning expert and content analyst.

Analyze this Instagram profile using the scraped data below. Base every claim on supplied evidence. Clearly label missing information instead of inventing it. Do not claim access to private Instagram Insights, reach, saves, watch time, demographics or data that is not present.

Return ONLY valid JSON with these sections:
{
  "executive_summary": {"overall_assessment":"...", "main_strengths":["..."], "main_problems":["..."], "priority":"..."},
  "profile_analysis": {"positioning":"...", "bio_review":"...", "first_impression":"...", "profile_improvements":["..."]},
  "brand_dna": {"niche":"...", "positioning":"...", "personality":["..."], "tone_of_voice":"...", "visual_identity":"...", "differentiation":"..."},
  "content_analysis": {"patterns":["..."], "strong_points":["..."], "weak_points":["..."], "formats_to_test":["..."]},
  "audience_intelligence": {"likely_audience":"...", "needs":["..."], "purchase_motivations":["..."], "objections":["..."]},
  "growth_strategy": {"content_pillars":[{"name":"...", "purpose":"...", "ideas":["..."]}], "reels_ideas":[{"hook":"...", "concept":"...", "cta":"..."}], "caption_strategy":"...", "discoverability":"..."},
  "profile_bio_options":[{"bio":"...", "reason":"..."}],
  "quick_wins":["..."],
  "missing_data":["..."]
}

Give specific, practical recommendations for this actual profile, not generic marketing advice.
Keep every section complete. Use concise but useful explanations. For each list, provide 3-5 meaningful items where evidence allows. Include 5 Reel ideas and 3 profile bio options. Do not repeat the same recommendation across sections. Return every required top-level JSON key. Analyze captions, formats and available engagement numbers where present. If there are too few posts, explicitly say the sample is limited. Use the profile's language when it can be identified.

SCRAPED DATA:
${JSON.stringify(snapshot).slice(0, 55000)}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(100_000),
    });

    if (!aiResponse.ok) {
      const details = (await aiResponse.text()).slice(0, 700);
      console.error("[Brand Intelligence] Anthropic error:", details);
      return NextResponse.json(
        { error: "ШІ не зміг завершити аналіз. Перевір Anthropic API та ліміти." },
        { status: 502 }
      );
    }

    const aiData = await aiResponse.json();
    let text = (aiData.content ?? [])
      .filter((item: { type: string }) => item.type === "text")
      .map((item: { text: string }) => item.text)
      .join("\n");

    const parseAudit = (raw: string) => {
      const cleaned = raw
        .replace(/^\s*```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      const first = cleaned.indexOf("{");
      const last = cleaned.lastIndexOf("}");
      if (first < 0 || last <= first) {
        throw new Error("No complete JSON object found.");
      }
      return JSON.parse(cleaned.slice(first, last + 1));
    };

    let audit: Record<string, unknown>;

    try {
      if (aiData.stop_reason === "max_tokens") {
        throw new Error("Claude response was truncated.");
      }
      audit = parseAudit(text);
    } catch (parseError) {
      console.warn("[Brand Intelligence] Invalid JSON; trying repair:", parseError);

      const repairResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 12000,
          messages: [{
            role: "user",
            content: `Repair this Instagram audit into one valid JSON object. Preserve its information. No markdown fences or commentary. Required top-level keys: executive_summary, profile_analysis, brand_dna, content_analysis, audience_intelligence, growth_strategy, profile_bio_options, quick_wins, missing_data.\n\n${text.slice(0, 24000)}`
          }]
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(100000),
      });

      if (!repairResponse.ok) {
        console.error("[Brand Intelligence] JSON repair failed:", (await repairResponse.text()).slice(0, 500));
        throw new Error("Не вдалося автоматично виправити JSON. Спробуй запустити аналіз ще раз.");
      }

      const repairedData = await repairResponse.json();
      const repairedText = (repairedData.content ?? [])
        .filter((item: { type: string }) => item.type === "text")
        .map((item: { text: string }) => item.text)
        .join("\n");

      try {
        if (repairedData.stop_reason === "max_tokens") {
          throw new Error("Repair response was truncated.");
        }
        audit = parseAudit(repairedText);
      } catch (repairError) {
        console.error("[Brand Intelligence] JSON repair still invalid:", repairError);
        throw new Error("Claude не зміг повернути повний JSON навіть після повторної спроби. Відповідь могла перевищити ліміт токенів.");
      }
    }

    const { error: saveError } = await supabase
      .from("brand_intelligence")
      .upsert(
        {
          user_id: user.id,
          profile_handle: handle,
          profile_data: snapshot,
          audit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,profile_handle" }
      );

    if (saveError) {
      console.error("[Brand Intelligence] Save failed:", saveError.message);
      return NextResponse.json(
        { error: "Аудит створено, але не вдалося зберегти його. Перевір міграцію Supabase." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      audit,
      profile: snapshot,
      handle,
      saved: true,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Сталася невідома помилка.";

    console.error("[Brand Intelligence]", message);

    return NextResponse.json(
      { error: message },
      { status: message.includes("посилання") ? 400 : 500 }
    );
  }
}
