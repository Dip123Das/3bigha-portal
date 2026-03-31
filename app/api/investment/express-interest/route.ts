import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveOpportunityOwnerUserId(row: Record<string, any> | null): string | null {
  if (!row) return null;

  const candidates = [
    "owner_user_id",
    "created_by",
    "created_by_user_id",
    "builder_user_id",
    "user_id",
  ];

  for (const key of candidates) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function pickExistingRoom(rows: Record<string, any>[] | null | undefined) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const active =
    rows.find((r) =>
      ["open", "active", "pending", "in_progress"].includes(
        String(r.status || "").toLowerCase()
      )
    ) || rows[0];

  return active;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const opportunityId = String(body?.opportunityId || body?.opportunity_id || "").trim();
    const initialMessage = String(
      body?.initialMessage || body?.message || body?.body || ""
    ).trim();

    if (!UUID_RE.test(opportunityId)) {
      return NextResponse.json(
        { error: "Valid opportunity id is required." },
        { status: 400 }
      );
    }

    const { data: opportunity, error: opportunityError } = await supabase
      .from("investment_opportunities")
      .select("*")
      .eq("id", opportunityId)
      .maybeSingle();

    if (opportunityError) {
      console.error("express-interest opportunity fetch error:", opportunityError);
      return NextResponse.json(
        { error: "Failed to load investment opportunity." },
        { status: 500 }
      );
    }

    if (!opportunity) {
      return NextResponse.json(
        { error: "Investment opportunity not found." },
        { status: 404 }
      );
    }

    if (String(opportunity.status || "") !== "approved") {
      return NextResponse.json(
        { error: "Only approved opportunities can receive investor interest." },
        { status: 400 }
      );
    }

    const promoterUserId = resolveOpportunityOwnerUserId(opportunity);

    if (!promoterUserId) {
      return NextResponse.json(
        { error: "Unable to resolve the promoter for this opportunity." },
        { status: 500 }
      );
    }

    if (promoterUserId === user.id) {
      return NextResponse.json(
        { error: "You cannot express interest in your own opportunity." },
        { status: 400 }
      );
    }

    const { data: existingRooms, error: existingRoomsError } = await supabase
      .from("investment_deal_rooms")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .eq("investor_user_id", user.id)
      .eq("builder_user_id", promoterUserId);

    if (existingRoomsError) {
      console.error("express-interest existing room lookup error:", existingRoomsError);
      return NextResponse.json(
        { error: "Failed to check existing deal rooms." },
        { status: 500 }
      );
    }

    const existingRoom = pickExistingRoom(existingRooms);

    if (existingRoom) {
      if (initialMessage) {
        const messageInsert: Record<string, any> = {
          deal_room_id: existingRoom.id,
          sender_user_id: user.id,
          body: initialMessage,
        };

        if ("message_type" in existingRoom || true) {
          messageInsert.message_type = "text";
        }

        const { error: messageError } = await supabase
          .from("investment_messages")
          .insert(messageInsert);

        if (messageError) {
          console.error("express-interest existing room message insert error:", messageError);
          return NextResponse.json(
            {
              error:
                "Deal room already exists, but failed to send your message.",
            },
            { status: 500 }
          );
        }

        const roomUpdatePayload: Record<string, any> = {};
        if ("updated_at" in existingRoom) {
          roomUpdatePayload.updated_at = new Date().toISOString();
        }
        if ("last_message_at" in existingRoom) {
          roomUpdatePayload.last_message_at = new Date().toISOString();
        }

        if (Object.keys(roomUpdatePayload).length > 0) {
          await supabase
            .from("investment_deal_rooms")
            .update(roomUpdatePayload)
            .eq("id", existingRoom.id);
        }
      }

      return NextResponse.json(
        {
          ok: true,
          message: "Deal room already exists.",
          data: existingRoom,
        },
        { status: 200 }
      );
    }

    const roomInsert: Record<string, any> = {
      opportunity_id: opportunityId,
      investor_user_id: user.id,
      builder_user_id: promoterUserId,
      status: "open",
    };

    if ("title" in opportunity) {
      roomInsert.title = opportunity.title || opportunity.name || "Investment Deal Room";
    }

    if ("slug" in opportunity && opportunity.slug) {
      roomInsert.opportunity_slug = opportunity.slug;
    }

    const snapshot: Record<string, any> = {
      opportunity_title:
        opportunity.title || opportunity.name || opportunity.opportunity_title || null,
      opportunity_slug: opportunity.slug || null,
      status: opportunity.status || null,
      sector: opportunity.sector || null,
      location: opportunity.location || opportunity.city || opportunity.state || null,
    };

    roomInsert.opportunity_snapshot = snapshot;

    const { data: createdRoom, error: createRoomError } = await supabase
      .from("investment_deal_rooms")
      .insert(roomInsert)
      .select("*")
      .single();

    if (createRoomError || !createdRoom) {
      console.error("express-interest create room error:", createRoomError);
      return NextResponse.json(
        { error: "Failed to create deal room." },
        { status: 500 }
      );
    }

    if (initialMessage) {
      const messageInsert: Record<string, any> = {
        deal_room_id: createdRoom.id,
        sender_user_id: user.id,
        body: initialMessage,
        message_type: "text",
      };

      const { error: messageError } = await supabase
        .from("investment_messages")
        .insert(messageInsert);

      if (messageError) {
        console.error("express-interest initial message insert error:", messageError);
        return NextResponse.json(
          { error: "Deal room created, but failed to send the initial message." },
          { status: 500 }
        );
      }

      const roomUpdatePayload: Record<string, any> = {};
      if ("updated_at" in createdRoom) {
        roomUpdatePayload.updated_at = new Date().toISOString();
      }
      if ("last_message_at" in createdRoom) {
        roomUpdatePayload.last_message_at = new Date().toISOString();
      }

      if (Object.keys(roomUpdatePayload).length > 0) {
        const { data: refreshedRoom } = await supabase
          .from("investment_deal_rooms")
          .update(roomUpdatePayload)
          .eq("id", createdRoom.id)
          .select("*")
          .single();

        return NextResponse.json(
          {
            ok: true,
            message: "Deal room created successfully.",
            data: refreshedRoom || createdRoom,
          },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Deal room created successfully.",
        data: createdRoom,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("express-interest route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}