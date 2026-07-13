"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const HANDOFF_KEY = "3bos.rfq.handoff.v1";

type ModuleChoice = "materials" | "services" | "rentals" | "properties";

type RfqHandoff = {
  version: 1;
  module: ModuleChoice;
  mode: string;
  item: string;
  qty: string;
  unit: string;
  neededBy: string;
  notes: string;
  name: string;
  phone: string;
  email: string;
  geo: {
    stateId?: string;
    stateName?: string;
    districtId?: string;
    districtName?: string;
    subdivisionId?: string;
    subdivisionName?: string;
    blockId?: string;
    blockName?: string;
    placeId?: string;
    placeName?: string;
    pincode?: string;
  };
};

const moduleLabels: Record<ModuleChoice, string> = {
  materials: "Materials",
  services: "Services",
  rentals: "Machinery / Rentals",
  properties: "Property",
};

function safeNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function todayPlus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeNeededBy(value: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value === "Today") return todayPlus(0);
  if (value === "Tomorrow") return todayPlus(1);
  if (value === "Within 3 days") return todayPlus(3);
  if (value === "Within 1 week") return todayPlus(7);
  return null;
}

export default function RfqReviewPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [handoff, setHandoff] = useState<RfqHandoff | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RfqHandoff;
      if (parsed?.version === 1 && parsed?.module && parsed?.item) {
        setHandoff(parsed);
      }
    } catch {
      setError("The saved requirement could not be read. Please return to the simple form.");
    }
  }, []);

  function update<K extends keyof RfqHandoff>(key: K, value: RfqHandoff[K]) {
    setHandoff((current) => (current ? { ...current, [key]: value } : current));
  }

  async function submit() {
    if (!handoff) return;
    setError("");

    const city =
      handoff.geo.placeName ||
      handoff.geo.blockName ||
      handoff.geo.districtName ||
      "";
    const locality =
      handoff.geo.placeName ||
      handoff.geo.blockName ||
      handoff.geo.districtName ||
      "";
    const pincode = handoff.geo.pincode || "";

    if (!handoff.item.trim()) return setError("Please enter what you need.");
    if (!city || !locality || !pincode) {
      return setError("Please return and select a location with a PIN code.");
    }
    if (!handoff.phone.trim() && !handoff.email.trim()) {
      return setError("Please provide a phone number or email address.");
    }

    setLoading(true);
    try {
      const attachments: Array<{
        bucket: string;
        object_path: string;
        file_name: string;
        mime_type: string | null;
        file_size: number | null;
      }> = [];

      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
        const objectPath = `public-${Date.now()}/${Date.now()}_${safeName}`;

        const uploaded = await supabase.storage
          .from("rfq_attachments")
          .upload(objectPath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

        if (uploaded.error) throw uploaded.error;

        attachments.push({
          bucket: "rfq_attachments",
          object_path: objectPath,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size || null,
        });
      }

      const response = await fetch("/api/rfq/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: handoff.module,
          title: handoff.item.trim(),
          description: handoff.notes.trim() || null,
          city,
          district: handoff.geo.districtName || null,
          locality,
          address: [
            handoff.geo.placeName,
            handoff.geo.blockName,
            handoff.geo.districtName,
            handoff.geo.stateName,
          ]
            .filter(Boolean)
            .join(", "),
          pincode,
          geo_state_id: handoff.geo.stateId || null,
          geo_district_id: handoff.geo.districtId || null,
          geo_subdivision_id: handoff.geo.subdivisionId || null,
          geo_block_id: handoff.geo.blockId || null,
          geo_place_id: handoff.geo.placeId || null,
          needed_by: normalizeNeededBy(handoff.neededBy),
          contact_name: handoff.name.trim() || null,
          contact_phone: handoff.phone.trim() || null,
          contact_email: handoff.email.trim() || null,
          items: [
            {
              material_name: handoff.item.trim(),
              qty: safeNumber(handoff.qty),
              unit: handoff.unit.trim() || null,
              notes: handoff.notes.trim() || null,
              sort_order: 0,
            },
          ],
          attachments,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "RFQ creation failed.");
      }

      window.sessionStorage.removeItem(HANDOFF_KEY);
      router.push("/rfq/success");
    } catch (cause: any) {
      setError(cause?.message || "Something went wrong while creating the RFQ.");
    } finally {
      setLoading(false);
    }
  }

  if (!handoff) {
    return (
      <main className="container pageBody" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            border: "1px solid #e2e8f0",
            borderRadius: 20,
            padding: 20,
          }}
        >
          <h1 style={{ marginTop: 0 }}>No requirement is ready for review</h1>
          <p>
            {error ||
              "Start with the simple RFQ form and your information will be carried here safely."}
          </p>
          <Link className="topBtn topBtnPrimary" href="/rfq">
            Create a simple requirement
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container pageBody" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>
        <header
          style={{
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            borderRadius: 20,
            padding: 20,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, color: "#047857" }}>
            HUMAN REVIEW
          </div>
          <h1 style={{ margin: "6px 0" }}>Review your requirement before submission</h1>
          <p style={{ margin: 0, fontWeight: 700, color: "#475569" }}>
            3Bigha has carried your information here. Nothing will be submitted until
            you decide.
          </p>
        </header>

        {error ? (
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              borderRadius: 14,
              padding: 12,
              color: "#991b1b",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div>
            <b>Purpose:</b> {moduleLabels[handoff.module]}
          </div>

          <label>
            <b>What do you need?</b>
            <input
              className="searchInput"
              value={handoff.item}
              onChange={(e) => update("item", e.target.value)}
            />
          </label>

          <div className="rfqReviewGrid">
            <label>
              <b>Quantity</b>
              <input
                className="searchInput"
                value={handoff.qty}
                onChange={(e) => update("qty", e.target.value)}
              />
            </label>

            <label>
              <b>Unit</b>
              <input
                className="searchInput"
                value={handoff.unit}
                onChange={(e) => update("unit", e.target.value)}
              />
            </label>
          </div>

          <label>
            <b>Notes</b>
            <textarea
              value={handoff.notes}
              onChange={(e) => update("notes", e.target.value)}
              style={{
                width: "100%",
                minHeight: 120,
                marginTop: 6,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
              }}
            />
          </label>
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: 18, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Delivery / Work Location</h2>
          <p style={{ marginBottom: 0 }}>
            {[
              handoff.geo.placeName,
              handoff.geo.blockName,
              handoff.geo.districtName,
              handoff.geo.stateName,
              handoff.geo.pincode,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: 18, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Attachments</h2>
          <input
            type="file"
            multiple
            accept="image/*,audio/*,application/pdf,.xls,.xlsx,.csv,.dwg,.dxf"
            onChange={(e) =>
              setFiles(e.target.files ? Array.from(e.target.files) : [])
            }
          />
          <p style={{ color: "#64748b", fontWeight: 700 }}>
            Add handwritten notes, photos, PDFs, BOQs, drawings or voice recordings here.
          </p>
        </section>

        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Contact</h2>
          <div className="rfqReviewGrid three">
            <input
              className="searchInput"
              placeholder="Name"
              value={handoff.name}
              onChange={(e) => update("name", e.target.value)}
            />
            <input
              className="searchInput"
              placeholder="Phone"
              value={handoff.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
            <input
              className="searchInput"
              placeholder="Email"
              value={handoff.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
        </section>

        <div className="rfqReviewActions">
          <button
            className="topBtn topBtnPrimary"
            type="button"
            disabled={loading}
            onClick={submit}
          >
            {loading ? "Submitting..." : "Submit RFQ"}
          </button>

          <Link className="topBtn topBtnGhost" href="/rfq">
            Edit in simple form
          </Link>

          <Link
            className="topBtn topBtnGhost"
            href={`/rfq/new?module=${handoff.module}&query=${encodeURIComponent(
              handoff.item
            )}`}
          >
            Open professional workspace
          </Link>
        </div>
      </div>

      <style jsx>{`
        .rfqReviewGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .rfqReviewGrid.three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .rfqReviewActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 700px) {
          .rfqReviewGrid,
          .rfqReviewGrid.three {
            grid-template-columns: 1fr;
          }

          .rfqReviewActions > * {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
