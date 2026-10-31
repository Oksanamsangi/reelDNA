import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  createOAuthClient,
  decryptToken,
  encryptToken,
} from "@/lib/google-calendar/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gcal_oauth_state")?.value;
  const receivedState = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  const redirect = (result: string) =>
    NextResponse.redirect(
      new URL(`/dashboard/smm?googleCalendar=${result}`, request.url),
    );

  if (!expectedState || !receivedState || expectedState !== receivedState) {
    const response = redirect("state_error");
    response.cookies.delete("gcal_oauth_state");
    return response;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("gcal_oauth_state");
    return response;
  }

  if (url.searchParams.has("error") || !code) {
    const response = redirect("cancelled");
    response.cookies.delete("gcal_oauth_state");
    return response;
  }

  try {
    const { data: existing, error: readError } = await supabase
      .from("google_calendar_connections")
      .select("encrypted_refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError) throw readError;

    const oauth = createOAuthClient();
    const { tokens } = await oauth.getToken(code);

    const refreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : existing?.encrypted_refresh_token;

    if (!refreshToken) {
      const response = redirect("missing_refresh_token");
      response.cookies.delete("gcal_oauth_state");
      return response;
    }

    const { error } = await supabase
      .from("google_calendar_connections")
      .upsert({
        user_id: user.id,
        encrypted_refresh_token: refreshToken,
        encrypted_access_token: tokens.access_token
          ? encryptToken(tokens.access_token)
          : null,
        expiry_date: tokens.expiry_date ?? null,
        scope: tokens.scope ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) throw error;

    const response = redirect("connected");
    response.cookies.delete("gcal_oauth_state");
    return response;
  } catch (error) {
    console.error("[Google Calendar] OAuth callback failed:", error);
    const response = redirect("connection_error");
    response.cookies.delete("gcal_oauth_state");
    return response;
  }
}
