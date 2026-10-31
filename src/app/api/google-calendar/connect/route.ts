import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOAuthClient } from "@/lib/google-calendar/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const state = randomBytes(32).toString("hex");
    const url = createOAuthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      state,
      scope: ["https://www.googleapis.com/auth/calendar.events"],
    });

    const response = NextResponse.redirect(url);
    response.cookies.set("gcal_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/google-calendar",
      maxAge: 600,
    });
    return response;
  } catch (error) {
    console.error("[Google Calendar] OAuth start failed:", error);
    return NextResponse.redirect(
      new URL("/dashboard/smm?googleCalendar=setup_error", request.url),
    );
  }
}
