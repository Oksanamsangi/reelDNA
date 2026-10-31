import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("content_plans")
      .select("id, title, plan, created_at, updated_at, archived_at, expires_at")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[SMM plans] Load failed:", error.message);
      return NextResponse.json(
        { error: "Could not load your saved strategies." },
        { status: 500 },
      );
    }

    const rows = data ?? [];
    const activePlans = rows.filter((item) => !item.archived_at);
    const savedPlan = activePlans[0] ?? null;
    const archivedPlans = rows.filter((item) => Boolean(item.archived_at));

    // Reconcile any older duplicate active records created before the archive feature.
    if (activePlans.length > 1) {
      const archivedAt = new Date();
      for (const oldPlan of activePlans.slice(1)) {
        const { error: archiveError } = await supabase
          .from("content_plans")
          .update({
            archived_at: archivedAt.toISOString(),
            expires_at: null,
          })
          .eq("id", oldPlan.id)
          .eq("user_id", auth.user.id);

        if (archiveError) {
          console.error("[SMM plans] Legacy archive failed:", archiveError.message);
        }
      }
    }

    return NextResponse.json({
      savedPlan,
      archivedPlans: [
        ...archivedPlans,
        ...activePlans.slice(1).map((item) => ({
          ...item,
          archived_at: now,
          expires_at: null,
        })),
      ],
    });
  } catch (error) {
    console.error("[SMM plans] Unexpected load error:", error);
    return NextResponse.json(
      { error: "Could not load your saved strategies." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;

    if (!input.plan || typeof input.plan !== "object" || Array.isArray(input.plan)) {
      return NextResponse.json({ error: "Invalid plan data." }, { status: 400 });
    }

    const title =
      typeof input.title === "string" && input.title.trim()
        ? input.title.trim().slice(0, 200)
        : "My content strategy";

    const values = {
      user_id: auth.user.id,
      title,
      plan: input.plan as never,
      updated_at: new Date().toISOString(),
    };

    const requestedId =
      typeof input.id === "string" && input.id.trim() ? input.id : null;

    // Existing plan updates (including task status changes) keep their archive state.
    if (requestedId) {
      const { data, error } = await supabase
        .from("content_plans")
        .update(values)
        .eq("id", requestedId)
        .eq("user_id", auth.user.id)
        .select("id, title, plan, created_at, updated_at, archived_at, expires_at")
        .maybeSingle();

      if (error) {
        console.error("[SMM plans] Update failed:", error.message);
        return NextResponse.json({ error: "Could not save your strategy." }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json(
          { error: "The saved plan was not found. Reload and try again." },
          { status: 404 },
        );
      }

      return NextResponse.json({ savedPlan: data });
    }

    // A new strategy gets its own row; never overwrite the previous business plan.
    const { data: newPlan, error: insertError } = await supabase
      .from("content_plans")
      .insert({ ...values, archived_at: null, expires_at: null })
      .select("id, title, plan, created_at, updated_at, archived_at, expires_at")
      .single();

    if (insertError || !newPlan) {
      console.error("[SMM plans] Insert failed:", insertError?.message);
      return NextResponse.json({ error: "Could not save your strategy." }, { status: 500 });
    }

    const archivedAt = new Date();
    // Archive every previous active strategy only after the new row has been saved.
    const { error: archiveError } = await supabase
      .from("content_plans")
      .update({
        archived_at: archivedAt.toISOString(),
        expires_at: null,
      })
      .eq("user_id", auth.user.id)
      .is("archived_at", null)
      .neq("id", newPlan.id);

    if (archiveError) {
      console.error("[SMM plans] Previous strategies could not all be archived:", archiveError.message);
      return NextResponse.json({
        savedPlan: newPlan,
        warning: "Your new strategy was saved, but the previous strategy archive needs a refresh.",
      });
    }

    return NextResponse.json({ savedPlan: newPlan });
  } catch (error) {
    console.error("[SMM plans] Unexpected save error:", error);
    return NextResponse.json({ error: "Could not save your strategy." }, { status: 500 });
  }
}


export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const id = (body as Record<string, unknown>).id;

    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "A valid strategy ID is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("content_plans")
      .delete()
      .eq("id", id.trim())
      .eq("user_id", auth.user.id)
      .not("archived_at", "is", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[SMM plans] Delete failed:", error.message);
      return NextResponse.json(
        { error: "Could not delete this archived strategy." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Archived strategy not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted: true, id: data.id });
  } catch (error) {
    console.error("[SMM plans] Unexpected delete error:", error);
    return NextResponse.json(
      { error: "Could not delete this archived strategy." },
      { status: 500 },
    );
  }
}
