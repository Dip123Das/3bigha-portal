import { createClient } from "@supabase/supabase-js";

export type MemoryEventType =
  | "listing_view"
  | "recommendation_click"
  | "rfq_created"
  | "rfq_compare"
  | "chat_open"
  | "chat_message"
  | "vendor_interaction"
  | "procurement_action"
  | "search"
  | "shortlist";

export type MemoryEventInput = {
  userId?: string | null;

  sessionId?: string | null;

  eventType: MemoryEventType;

  module?: string | null;

  entityId?: string | null;

  entityTitle?: string | null;

  category?: string | null;

  type?: string | null;

  city?: string | null;

  district?: string | null;

  locality?: string | null;

  metadata?: Record<string, any>;

  score?: number | null;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables missing."
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

function clean(value: unknown) {
  const v = String(value || "").trim();
  return v || null;
}

export async function trackMemoryEvent(
  input: MemoryEventInput
) {
  try {
    const supabase = getAdminClient();

    const payload = {
      user_id: clean(input.userId),

      session_id: clean(input.sessionId),

      event_type: clean(input.eventType),

      module: clean(input.module),

      entity_id: clean(input.entityId),

      entity_title: clean(input.entityTitle),

      category: clean(input.category),

      type: clean(input.type),

      city: clean(input.city),

      district: clean(input.district),

      locality: clean(input.locality),

      metadata: input.metadata || {},

      score:
        typeof input.score === "number"
          ? input.score
          : null,

      created_at:
        new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("ai_memory_events")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error(
        "trackMemoryEvent insert failed",
        error
      );

      return {
        ok: false,
        error: error.message,
      };
    }

    return {
      ok: true,
      event: data,
    };
  } catch (err: any) {
    console.error(
      "trackMemoryEvent failed",
      err
    );

    return {
      ok: false,
      error:
        err?.message ||
        "Memory event tracking failed.",
    };
  }
}

export async function getUserMemorySummary(
  userId: string
) {
  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("ai_memory_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(300);

    if (error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    const rows = data || [];

    const countTop = (
      values: string[],
      limit = 5
    ) => {
      const map = new Map<string, number>();

      values
        .filter(Boolean)
        .forEach((v) => {
          map.set(v, (map.get(v) || 0) + 1);
        });

      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([value, count]) => ({
          value,
          count,
        }));
    };

    const topModules = countTop(
      rows.map((x) => x.module)
    );

    const topCategories = countTop(
      rows.map((x) => x.category)
    );

    const topLocations = countTop(
      rows.flatMap((x) => [
        x.locality,
        x.city,
        x.district,
      ])
    );

    const topActions = countTop(
      rows.map((x) => x.event_type)
    );

    return {
      ok: true,

      totalEvents: rows.length,

      topModules,

      topCategories,

      topLocations,

      topActions,

      latestEvent:
        rows[0] || null,
    };
  } catch (err: any) {
    return {
      ok: false,
      error:
        err?.message ||
        "Memory summary failed.",
    };
  }
}