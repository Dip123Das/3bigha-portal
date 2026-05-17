import { NextResponse } from "next/server";
import OpenAI from "openai";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MaterialRow = {
  id: string;
  title: string | null;
  local_name: string | null;
  sku: string | null;
  attributes: any;
  created_at: string | null;
  updated_at: string | null;
};

type MovementRow = {
  id: string;
  material_listing_id: string | null;
  movement_type: string;
  quantity: number | string | null;
  unit: string | null;
  total_value: number | string | null;
  created_at: string;
};

function asNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function getInventory(row: MaterialRow) {
  return row.attributes?.inventory && typeof row.attributes.inventory === "object"
    ? row.attributes.inventory
    : null;
}

function getName(row: MaterialRow) {
  return row.title || row.local_name || row.sku || "Inventory item";
}

function fallbackIntelligence(materials: MaterialRow[], movements: MovementRow[]) {
  const byMaterial = new Map<string, MovementRow[]>();

  for (const m of movements) {
    if (!m.material_listing_id) continue;
    const list = byMaterial.get(m.material_listing_id) || [];
    list.push(m);
    byMaterial.set(m.material_listing_id, list);
  }

  const lowStock = [];
  const deadStock = [];
  const fastMoving = [];
  const reorder = [];

  for (const item of materials) {
    const inv = getInventory(item);
    if (!inv) continue;

    const current = asNumber(inv.current_stock);
    const reorderLevel = asNumber(inv.reorder_level);
    const itemMovements = byMaterial.get(item.id) || [];
    const stockOut = itemMovements
      .filter((m) => asNumber(m.quantity) < 0 || ["sale", "online_order", "offline_bill"].includes(m.movement_type))
      .reduce((sum, m) => sum + Math.abs(asNumber(m.quantity)), 0);

    if (reorderLevel > 0 && current <= reorderLevel) {
      lowStock.push({
        item: getName(item),
        current_stock: current,
        reorder_level: reorderLevel,
        unit: inv.stock_unit || "",
        reason: "Current stock is at or below reorder level.",
      });

      reorder.push({
        item: getName(item),
        suggested_quantity: Math.max(reorderLevel * 2 - current, reorderLevel),
        unit: inv.stock_unit || "",
        reason: "Suggested reorder based on low stock threshold.",
      });
    }

    if (stockOut >= Math.max(10, reorderLevel || 10)) {
      fastMoving.push({
        item: getName(item),
        movement_quantity: stockOut,
        unit: inv.stock_unit || "",
        reason: "Recent stock-out movement is high.",
      });
    }

    if (itemMovements.length === 0 && item.created_at) {
      const ageDays = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000);
      if (ageDays >= 30) {
        deadStock.push({
          item: getName(item),
          age_days: ageDays,
          current_stock: current,
          unit: inv.stock_unit || "",
          reason: "No recorded stock movement for 30+ days.",
        });
      }
    }
  }

  return {
    ok: true,
    source: "fallback_inventory_rules",
    summary: "Inventory intelligence generated from stock, reorder level and stock movement rules.",
    lowStock,
    fastMoving,
    deadStock,
    reorderSuggestions: reorder,
    nextActions: [
      "Review low-stock products and create purchase entries.",
      "Update reorder levels for fast-moving products.",
      "Check dead-stock items and consider discounts or promotion.",
      "Keep billing active so stock movements stay accurate.",
    ],
  };
}

export async function GET() {
  const supabase = getSupabaseServerClient(cookies());

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return NextResponse.json({ ok: false, error: sessionError.message }, { status: 401 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const userId = session.user.id;

  const [materialsRes, movementsRes, billsRes, dispatchRes, vehiclesRes] = await Promise.all([
    supabase
      .from("material_listings")
      .select("id,title,local_name,sku,attributes,created_at,updated_at")
      .eq("vendor_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(300),

    supabase
      .from("inventory_stock_movements")
      .select("id,material_listing_id,movement_type,quantity,unit,total_value,created_at")
      .eq("vendor_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),

    supabase
      .from("inventory_bills")
      .select("id,bill_no,bill_type,total_amount,payment_status,created_at")
      .eq("vendor_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("inventory_dispatches")
      .select("id,dispatch_status,material_name,quantity,unit,created_at")
      .eq("vendor_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("vendor_vehicles")
      .select("id,vehicle_type,vehicle_number,current_status,load_capacity,created_at")
      .eq("vendor_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (materialsRes.error) {
    return NextResponse.json({ ok: false, error: materialsRes.error.message }, { status: 500 });
  }

  const materials = ((materialsRes.data || []) as MaterialRow[]).filter((row) => getInventory(row));
  const movements = (movementsRes.data || []) as MovementRow[];
  const bills = billsRes.data || [];
  const dispatches = dispatchRes.data || [];
  const vehicles = vehiclesRes.data || [];

  const fallback = fallbackIntelligence(materials, movements);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(fallback);
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const inventoryPayload = materials.slice(0, 80).map((row) => {
      const inv = getInventory(row);

      return {
        id: row.id,
        name: getName(row),
        sku: row.sku || inv?.sku_code || null,
        current_stock: inv?.current_stock || null,
        opening_stock: inv?.opening_stock || null,
        unit: inv?.stock_unit || null,
        reorder_level: inv?.reorder_level || null,
        selling_price: inv?.selling_price || null,
        purchase_price: inv?.purchase_price || null,
        godown_no: inv?.godown_no || null,
        room_no: inv?.room_no || null,
        rack_no: inv?.rack_no || null,
        updated_at: row.updated_at,
      };
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are 3Bigha AI Inventory Intelligence. Analyze construction material shop/godown inventory, billing, dispatch and fleet data. Return only valid compact JSON. Do not include markdown.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Generate inventory intelligence for a vendor. Detect low stock, fast-moving products, dead stock, reorder recommendations, billing insight, dispatch insight and fleet utilization insight. Keep it practical for local building material sellers.",
            inventory: inventoryPayload,
            stock_movements: movements.slice(0, 150),
            recent_bills: bills.slice(0, 50),
            recent_dispatches: dispatches.slice(0, 50),
            vehicles: vehicles.slice(0, 50),
            fallback_rules: fallback,
            expected_json_shape: {
              ok: true,
              source: "openai_inventory_intelligence",
              summary: "string",
              riskLevel: "low | medium | high",
              lowStock: [],
              fastMoving: [],
              deadStock: [],
              reorderSuggestions: [],
              billingInsight: "string",
              dispatchInsight: "string",
              fleetInsight: "string",
              nextActions: [],
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    });

    const raw = response.output_text || "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      ...fallback,
      ...parsed,
      ok: true,
      source: parsed.source || "openai_inventory_intelligence",
      fallback,
    });
  } catch (e: any) {
    return NextResponse.json({
      ...fallback,
      ai_error: e?.message || "AI inventory intelligence failed, fallback used.",
    });
  }
}