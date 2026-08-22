import { NextResponse } from "next/server";
import OpenAI from "openai";

import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  buildDeterministicInventoryIntelligence,
  type InventoryIntelligenceRow,
} from "@/lib/inventory/intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillRow = {
  id: string;
  bill_no: string | null;
  bill_type: string | null;
  total_amount: number | string | null;
  payment_status: string | null;
  created_at: string | null;
};

type DispatchRow = {
  id: string;
  dispatch_status: string | null;
  material_name: string | null;
  quantity: number | string | null;
  unit: string | null;
  created_at: string | null;
};

type VehicleRow = {
  id: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  current_status: string | null;
  load_capacity: number | string | null;
  created_at: string | null;
};

export async function GET() {
  const supabase = getSupabaseServerClient(cookies());

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return NextResponse.json(
      { ok: false, error: sessionError.message },
      { status: 401 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const userId = session.user.id;

  const [intelligenceRes, billsRes, dispatchRes, vehiclesRes] =
    await Promise.all([
      supabase
        .from("bos_material_inventory_intelligence")
        .select("*")
        .eq("user_id", userId)
        .order("risk_score", { ascending: false })
        .limit(500),

      supabase
        .from("inventory_bills")
        .select(
          "id,bill_no,bill_type,total_amount,payment_status,created_at",
        )
        .eq("vendor_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("inventory_dispatches")
        .select(
          "id,dispatch_status,material_name,quantity,unit,created_at",
        )
        .eq("vendor_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("vendor_vehicles")
        .select(
          "id,vehicle_type,vehicle_number,current_status,load_capacity,created_at",
        )
        .eq("vendor_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (intelligenceRes.error) {
    return NextResponse.json(
      { ok: false, error: intelligenceRes.error.message },
      { status: 500 },
    );
  }

  const rows = (intelligenceRes.data || []) as InventoryIntelligenceRow[];
  const bills = (billsRes.data || []) as BillRow[];
  const dispatches = (dispatchRes.data || []) as DispatchRow[];
  const vehicles = (vehiclesRes.data || []) as VehicleRow[];

  const deterministic = buildDeterministicInventoryIntelligence(rows);

  const billingInsight =
    bills.length === 0
      ? "No recent billing records were found."
      : `${bills.length} recent bill(s) were reviewed. Keep every sale linked to the canonical stock posting workflow.`;

  const dispatchInsight =
    dispatches.length === 0
      ? "No recent dispatch records were found."
      : `${dispatches.length} recent dispatch record(s) were reviewed. Dispatch must not deduct stock again when billing has already posted the sale.`;

  const availableVehicles = vehicles.filter((vehicle) =>
    ["available", "idle", "ready"].includes(
      String(vehicle.current_status || "").toLowerCase(),
    ),
  ).length;

  const fleetInsight =
    vehicles.length === 0
      ? "No fleet records were found."
      : `${availableVehicles} of ${vehicles.length} vehicle(s) currently appear available for dispatch.`;

  const canonicalResponse = {
    ...deterministic,
    billingInsight,
    dispatchInsight,
    fleetInsight,
  };

  if (!process.env.OPENAI_API_KEY || rows.length === 0) {
    return NextResponse.json(canonicalResponse);
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are 3Bigha Inventory Intelligence. Deterministic stock metrics are authoritative. Return only compact valid JSON. Do not alter counts, quantities, risk scores, classifications or reorder quantities. Provide only a management summary, operational insights and action wording.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Explain the canonical inventory intelligence in practical language for a local building-material business. Do not recalculate or replace any deterministic metric.",
            canonical_intelligence: {
              summary: deterministic.summary,
              riskLevel: deterministic.riskLevel,
              healthScore: deterministic.healthScore,
              totals: deterministic.totals,
              counts: deterministic.counts,
              highRisk: deterministic.highRisk.slice(0, 20),
              lowStock: deterministic.lowStock.slice(0, 20),
              deadStock: deterministic.deadStock.slice(0, 20),
              reorderSuggestions:
                deterministic.reorderSuggestions.slice(0, 20),
              locationDrift: deterministic.locationDrift.slice(0, 20),
            },
            recent_bills: bills.slice(0, 30),
            recent_dispatches: dispatches.slice(0, 30),
            vehicles: vehicles.slice(0, 30),
            expected_json_shape: {
              managementSummary: "string",
              billingInsight: "string",
              dispatchInsight: "string",
              fleetInsight: "string",
              nextActions: ["string"],
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

    const parsed = JSON.parse(response.output_text || "{}");

    return NextResponse.json({
      ...canonicalResponse,
      source: "canonical_inventory_intelligence_with_ai_explanation",
      managementSummary:
        typeof parsed.managementSummary === "string"
          ? parsed.managementSummary
          : deterministic.summary,
      billingInsight:
        typeof parsed.billingInsight === "string"
          ? parsed.billingInsight
          : billingInsight,
      dispatchInsight:
        typeof parsed.dispatchInsight === "string"
          ? parsed.dispatchInsight
          : dispatchInsight,
      fleetInsight:
        typeof parsed.fleetInsight === "string"
          ? parsed.fleetInsight
          : fleetInsight,
      nextActions:
        Array.isArray(parsed.nextActions) &&
        parsed.nextActions.every(
          (action: unknown) => typeof action === "string",
        )
          ? parsed.nextActions
          : deterministic.nextActions,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ...canonicalResponse,
      ai_error:
        error instanceof Error
          ? error.message
          : "AI explanation failed; canonical intelligence was returned.",
    });
  }
}
