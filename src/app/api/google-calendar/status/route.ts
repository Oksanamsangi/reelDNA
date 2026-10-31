import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[Google Calendar] Status check failed:", error.message);
    return NextResponse.json(
      { error: "Could not check Google Calendar connection." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    connected: Boolean(data),
    connectedAt: data?.updated_at ?? null,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { error } = await supabase
    .from("google_calendar_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("[Google Calendar] Disconnect failed:", error.message);
    return NextResponse.json(
      { error: "Could not disconnect Google Calendar." },
      { status: 500 },
    );
  }

  return NextResponse.json({ disconnected: true });
}
