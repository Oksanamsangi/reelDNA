import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import {
  createOAuthClient,
  decryptToken,
  deterministicEventId,
} from "@/lib/google-calendar/security";

export const runtime = "nodejs";

type Task = {
  day?: string;
  scheduled_date?: string;
  format?: string;
  topic?: string;
  hook?: string;
  cta?: string;
  objective?: string;
  shot_list?: string[];
};

function localDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
}

function dayIndex(day: string, fallback: number) {
  const normalized = day.toLowerCase().replace(/[^a-z0-9а-яіїєґ]/gi, "");
  const aliases = [
    ["monday", "mon", "понеділок", "пон"],
    ["tuesday", "tue", "tues", "вівторок", "вів"],
    ["wednesday", "wed", "середа", "сер"],
    ["thursday", "thu", "thur", "thurs", "четвер", "чет"],
    ["friday", "fri", "пятниця", "п'ятниця", "пят"],
    ["saturday", "sat", "субота", "суб"],
    ["sunday", "sun", "неділя", "нед"],
  ];

  const index = aliases.findIndex((names) =>
    names.some((name) => normalized.includes(name.replace(/[^a-z0-9а-яіїєґ]/gi, ""))),
  );

  if (index >= 0) return index;

  const numbered = day.match(/(?:day|день)\s*(\d+)/i);
  if (numbered) return (Number(numbered[1]) - 1 + 7) % 7;

  return fallback % 7;
}

function isoDate(offset: number) {
  const today = localDateParts(new Date());
  const date = new Date(
    Date.UTC(today.year, today.month - 1, today.day),
  );
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function taskDescription(task: Task, status: string) {
  return [
    `Format: ${task.format || "Content"}`,
    `Status: ${status}`,
    "",
    "HOOK",
    task.hook || "Not specified",
    "",
    "PURPOSE",
    task.objective || task.topic || "Not specified",
    "",
    "CALL TO ACTION",
    task.cta || "Not specified",
    "",
    "SHOT LIST",
    ...(task.shot_list?.length ? task.shot_list : ["Not specified"]),
    "",
    "Synced from Reel DNA",
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    let body: { planId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (typeof body.planId !== "string" || !body.planId) {
      return NextResponse.json({ error: "A saved plan is required." }, { status: 400 });
    }

    const [{ data: connection, error: connectionError }, { data: savedPlan, error: planError }] =
      await Promise.all([
        supabase
          .from("google_calendar_connections")
          .select("encrypted_refresh_token")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("content_plans")
          .select("id, title, plan")
          .eq("id", body.planId)
          .eq("user_id", user.id)
          .is("archived_at", null)
          .maybeSingle(),
      ]);

    if (connectionError) throw connectionError;
    if (planError) throw planError;

    if (!connection) {
      return NextResponse.json(
        { error: "Connect Google Calendar first." },
        { status: 409 },
      );
    }

    if (!savedPlan) {
      return NextResponse.json(
        { error: "Active saved strategy not found. Save your strategy and try again." },
        { status: 404 },
      );
    }

    const storedPlan = savedPlan.plan as {
      strategy?: { weekly_plan?: Task[] };
      taskStatuses?: Record<string, string>;
    };
    const tasks = storedPlan.strategy?.weekly_plan;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: "The saved strategy has no content tasks." },
        { status: 400 },
      );
    }

    const oauth = createOAuthClient();
    oauth.setCredentials({
      refresh_token: decryptToken(connection.encrypted_refresh_token),
    });

    const calendar = google.calendar({ version: "v3", auth: oauth });
    const results: { topic: string; date: string; action: "created" | "updated" }[] = [];

    for (const [index, rawTask] of tasks.entries()) {
      const task = rawTask ?? {};
      const taskKey = `${task.day || "day"}-${index}`;
      const status = storedPlan.taskStatuses?.[taskKey] || "planned";
      const dayOffset =
        tasks.length <= 1
          ? 0
          : Math.round(index * 6 / (tasks.length - 1));
      const date = isoDate(dayOffset);
      const eventId = deterministicEventId(user.id, savedPlan.id, taskKey);

      const event = {
        id: eventId,
        summary: `${task.format || "Content"}: ${task.topic || "Content task"}`.slice(0, 1024),
        description: taskDescription(task, status),
        start: { date },
        end: {
          date: new Date(Date.parse(`${date}T00:00:00Z`) + 86400000)
            .toISOString()
            .slice(0, 10),
        },
        reminders: { useDefault: true },
      };

      try {
        await calendar.events.get({ calendarId: "primary", eventId });
        await calendar.events.update({
          calendarId: "primary",
          eventId,
          requestBody: event,
        });
        results.push({ topic: task.topic || "Content task", date, action: "updated" });
      } catch (error: unknown) {
        const statusCode = (error as { code?: number })?.code;

        if (statusCode !== 404) throw error;

        try {
          await calendar.events.insert({
            calendarId: "primary",
            requestBody: event,
          });
          results.push({ topic: task.topic || "Content task", date, action: "created" });
        } catch (insertError: unknown) {
          // A concurrent sync may have inserted this deterministic event ID.
          if ((insertError as { code?: number })?.code !== 409) throw insertError;

          await calendar.events.update({
            calendarId: "primary",
            eventId,
            requestBody: event,
          });
          results.push({ topic: task.topic || "Content task", date, action: "updated" });
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: results.length,
      created: results.filter((item) => item.action === "created").length,
      updated: results.filter((item) => item.action === "updated").length,
      events: results,
    });
  } catch (error) {
    console.error("[Google Calendar] Sync failed:", error);
    return NextResponse.json(
      { error: "Google Calendar sync failed. Check the connection and try again." },
      { status: 500 },
    );
  }
}
