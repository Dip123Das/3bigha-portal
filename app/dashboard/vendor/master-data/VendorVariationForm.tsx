"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import UniversalDashboardShell from "@/components/operational/UniversalDashboardShell";

export default function VendorVariationForm({
  module,
  title,
  subtitle,
  examples,
}: {
  module: "materials" | "rentals";
  title: string;
  subtitle: string;
  examples: string[];
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [baseCategory, setBaseCategory] = useState("");
  const [baseSubcategory, setBaseSubcategory] = useState("");
  const [variation, setVariation] = useState("");
  const [specName, setSpecName] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [unit, setUnit] = useState("");
  const [searchWords, setSearchWords] = useState("");
  const [notes, setNotes] = useState("");

  async function save() {
    setMsg("");
    const cleanVariation = variation.trim();

    if (!cleanVariation) {
      setMsg("Please enter the product or rental variation name.");
      return;
    }

    setBusy(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setMsg("Please login first.");
        return;
      }

      const { data: bp, error: bpErr } = await supabase
        .from("business_profiles")
        .select("subscription_plan,subscription_status,approval_status,location_verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (bpErr) throw bpErr;

      const plan = String((bp as any)?.subscription_plan || "free").toLowerCase();
      const status = String((bp as any)?.subscription_status || "free").toLowerCase();
      const approval = String(
        (bp as any)?.approval_status ||
          (bp as any)?.location_verification_status ||
          ""
      ).toLowerCase();

      const paid = status === "active" && plan !== "free";
      const verified = approval === "approved" || approval === "verified";

      if (!paid || !verified) {
        setMsg("Only paid and verified vendors can add custom variations.");
        return;
      }

      const { error } = await supabase.from("vendor_taxonomy_extensions").insert({
        vendor_user_id: user.id,
        module,
        base_category: baseCategory.trim() || null,
        base_subcategory: baseSubcategory.trim() || null,
        product_variation: cleanVariation,
        specification_name: specName.trim() || null,
        specification_value: specValue.trim() || null,
        unit_or_packaging: unit.trim() || null,
        buyer_search_words: searchWords.trim() || null,
        notes: notes.trim() || null,
        status: "vendor_private",
      });

      if (error) throw error;

      setMsg("Saved successfully. This variation is now connected to your vendor profile.");
      setBaseCategory("");
      setBaseSubcategory("");
      setVariation("");
      setSpecName("");
      setSpecValue("");
      setUnit("");
      setSearchWords("");
      setNotes("");
    } catch (e: any) {
      setMsg(e?.message || "Could not save. Please check database table and RLS.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <UniversalDashboardShell
      eyebrow="Vendor Product Setup"
      title={title}
      subtitle={subtitle}
    >
      <section style={{ border: "1px solid #e2e8f0", borderRadius: 20, background: "#fff", padding: 18 }}>
        <div style={{ fontWeight: 950, fontSize: 18, color: "#0f172a" }}>
          Add in simple buyer language
        </div>
        <p style={{ marginTop: 6, color: "#64748b", fontWeight: 650, lineHeight: 1.6 }}>
          Do not worry about technical taxonomy. Write what your buyers normally ask for.
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <input value={baseCategory} onChange={(e) => setBaseCategory(e.target.value)} placeholder="Main category, e.g. Cement / JCB / Scaffolding" className="vendorInput" />
          <input value={baseSubcategory} onChange={(e) => setBaseSubcategory(e.target.value)} placeholder="Subcategory, e.g. PPC Cement / Backhoe Loader" className="vendorInput" />
          <input value={variation} onChange={(e) => setVariation(e.target.value)} placeholder="Product variation buyers search for *" className="vendorInput" />
          <input value={specName} onChange={(e) => setSpecName(e.target.value)} placeholder="Specification name, e.g. Size / Grade / Capacity" className="vendorInput" />
          <input value={specValue} onChange={(e) => setSpecValue(e.target.value)} placeholder="Specification value, e.g. 12mm / 50kg / 1.5 ton" className="vendorInput" />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit or packaging, e.g. bag / truck / day / sq ft" className="vendorInput" />
          <input value={searchWords} onChange={(e) => setSearchWords(e.target.value)} placeholder="Other local search words buyers may use" className="vendorInput" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for your team or admin review" className="vendorInput" rows={4} />

          <button
            type="button"
            onClick={save}
            disabled={busy}
            style={{
              border: 0,
              borderRadius: 14,
              background: "#1d4ed8",
              color: "#fff",
              padding: "13px 16px",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            {busy ? "Saving..." : "Save Variation"}
          </button>

          {msg ? (
            <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", color: "#1e3a8a", borderRadius: 14, padding: 12, fontWeight: 800 }}>
              {msg}
            </div>
          ) : null}
        </div>
      </section>

      <section style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 20, background: "#f8fafc", padding: 18 }}>
        <div style={{ fontWeight: 950, color: "#0f172a" }}>Examples</div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {examples.map((x) => (
            <div key={x} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 12, padding: 10, color: "#475569", fontWeight: 700 }}>
              {x}
            </div>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        <Link href="/dashboard/vendor/master-data" style={{ fontWeight: 900, color: "#1d4ed8" }}>
          ← Back to product setup
        </Link>
      </div>

      <style jsx>{`
        .vendorInput {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 13px 14px;
          font-size: 14px;
          font-weight: 650;
          outline: none;
        }
      `}</style>
    </UniversalDashboardShell>
  );
}
