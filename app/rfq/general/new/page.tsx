// app/rfq/general/new/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type RfqModule = "materials" | "services" | "rentals" | "properties";

type ItemRow = {
  item_name: string;
  qty: string;
  unit: string;
  notes: string;
};

/* ---------- Simple popup helper (NEW) ---------- */
function showPopup(message: string, type: "success" | "error" = "success") {
  const bg = type === "success" ? "#16a34a" : "#dc2626";
  const div = document.createElement("div");
  div.innerText = message;

  div.style.position = "fixed";
  div.style.top = "20px";
  div.style.right = "20px";
  div.style.zIndex = "9999";
  div.style.padding = "14px 18px";
  div.style.background = bg;
  div.style.color = "#fff";
  div.style.borderRadius = "10px";
  div.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
  div.style.fontWeight = "600";
  div.style.maxWidth = "380px";
  div.style.whiteSpace = "pre-wrap";

  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

function safeNum(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function moduleLabel(m: RfqModule) {
  if (m === "materials") return "Materials";
  if (m === "services") return "Services";
  if (m === "rentals") return "Rentals";
  return "Properties";
}

// ✅ Browse goes to RFQ browse page (not UI pages)
function browseHref(m: RfqModule) {
  return `/rfq/general/browse/${m}`;
}

function defaultTitleHint(m: RfqModule) {
  if (m === "materials") return "Example: Cement + Rod + Sand for 2-storey house";
  if (m === "services") return "Example: House wiring work + labour + material";
  if (m === "rentals") return "Example: JCB rent for 2 days with operator";
  return "Example: Need 2 katha plot near Cooch Behar within budget";
}

function normalizePickedText(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function isValidModule(x: any): x is RfqModule {
  return x === "materials" || x === "services" || x === "rentals" || x === "properties";
}

/**
 * picked={"mode":"typed","applyAs":"hint","values":["Cement","PPC Cement"],"module":"materials"}
 * picked={"mode":"typed","applyAs":"item","values":["Ambuja PPC"],"module":"materials"}
 * picked={"mode":"other","text":"Need custom item...","module":"services"}
 */
type PickedPayload =
  | { mode: "other"; text: string; module?: RfqModule }
  | { mode: "typed"; applyAs: "hint" | "item"; values: string[]; module?: RfqModule };

function parsePickedPayload(raw: string | null): PickedPayload | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const j = JSON.parse(decoded);

    if (j?.mode === "other" && typeof j?.text === "string") {
      const text = normalizePickedText(j.text);
      if (!text) return null;
      const module = isValidModule(j.module) ? j.module : undefined;
      return { mode: "other", text, module };
    }

    if (j?.mode === "typed") {
      const applyAs: any = j.applyAs;
      const values: any = j.values;
      if ((applyAs !== "hint" && applyAs !== "item") || !Array.isArray(values)) return null;

      const clean = values.map((x: any) => normalizePickedText(String(x || ""))).filter(Boolean);
      if (clean.length === 0) return null;

      const module = isValidModule(j.module) ? j.module : undefined;
      return { mode: "typed", applyAs, values: clean, module };
    }

    return null;
  } catch {
    return null;
  }
}

// ✅ helper: scroll to element with offset (sticky header safe)
function scrollToWithOffset(el: HTMLElement, offsetPx: number) {
  const y = el.getBoundingClientRect().top + window.scrollY - offsetPx;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}

const DRAFT_KEY = "rfq_general_new_draft_v1";

function RfqGeneralNewPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // ✅ Unified module selector
  const [module, setModule] = useState<RfqModule>("services");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [neededBy, setNeededBy] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");

  const [items, setItems] = useState<ItemRow[]>([{ item_name: "", qty: "", unit: "", notes: "" }]);
  const [files, setFiles] = useState<File[]>([]); // ⚠ cannot persist in sessionStorage

  // ✅ Module box focus + flash
  const moduleBoxRef = useRef<HTMLDivElement | null>(null);
  const [flashModuleBox, setFlashModuleBox] = useState(false);

  // ✅ show inline module selector near typed items
  const [showInlineModule, setShowInlineModule] = useState(false);

  // ✅ prevent saving draft before first restore finishes
  const restoredOnceRef = useRef(false);

  // ✅ Restore draft on first mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) {
        restoredOnceRef.current = true;
        return;
      }
      const d = JSON.parse(raw);

      if (isValidModule(d?.module)) setModule(d.module);

      if (typeof d?.title === "string") setTitle(d.title);
      if (typeof d?.description === "string") setDescription(d.description);

      if (typeof d?.city === "string") setCity(d.city);
      if (typeof d?.locality === "string") setLocality(d.locality);
      if (typeof d?.address === "string") setAddress(d.address);
      if (typeof d?.pincode === "string") setPincode(d.pincode);
      if (typeof d?.neededBy === "string") setNeededBy(d.neededBy);

      if (typeof d?.contactName === "string") setContactName(d.contactName);
      if (typeof d?.contactPhone === "string") setContactPhone(d.contactPhone);
      if (typeof d?.contactEmail === "string") setContactEmail(d.contactEmail);
      if (typeof d?.contactWhatsapp === "string") setContactWhatsapp(d.contactWhatsapp);

      if (Array.isArray(d?.items)) {
        const clean: ItemRow[] = d.items
          .map((x: any) => ({
            item_name: String(x?.item_name ?? ""),
            qty: String(x?.qty ?? ""),
            unit: String(x?.unit ?? ""),
            notes: String(x?.notes ?? ""),
          }))
          .filter((x: ItemRow) => typeof x.item_name === "string");

        if (clean.length > 0) setItems(clean);
      }

      setShowInlineModule(!!d?.showInlineModule);
    } catch {
      // ignore
    } finally {
      restoredOnceRef.current = true;
    }
  }, []);

  // ✅ Save draft whenever form state changes (debounced)
  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!restoredOnceRef.current) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      try {
        const payload = {
          module,
          title,
          description,
          city,
          locality,
          address,
          pincode,
          neededBy,
          contactName,
          contactPhone,
          contactEmail,
          contactWhatsapp,
          items,
          showInlineModule,
        };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    }, 250);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [
    module,
    title,
    description,
    city,
    locality,
    address,
    pincode,
    neededBy,
    contactName,
    contactPhone,
    contactEmail,
    contactWhatsapp,
    items,
    showInlineModule,
  ]);

  const focusModuleBox = () => {
    const el = moduleBoxRef.current;
    if (!el) return;

    const HEADER_OFFSET = 140;
    scrollToWithOffset(el, HEADER_OFFSET);

    setFlashModuleBox(true);
    window.setTimeout(() => setFlashModuleBox(false), 900);
  };

  function addItem(preset?: Partial<ItemRow>) {
    setItems((prev) => [...prev, { item_name: "", qty: "", unit: "", notes: "", ...(preset || {}) }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  // ---------- helpers to apply incoming picks ----------
  function appendHintLines(lines: string[]) {
    setDescription((prev) => {
      const base = (prev || "").trim();
      const existing = base ? base.split("\n").map((x) => x.trim()) : [];
      const add = lines
        .map((x) => `• ${normalizePickedText(x)}`)
        .filter(Boolean)
        .filter((line) => !existing.includes(line));

      if (!base) return add.join("\n");
      if (add.length === 0) return base;
      return `${base}\n${add.join("\n")}`;
    });
  }

  // ✅ better: fill FIRST blank row anywhere, then append remaining
  function addItemNames(names: string[]) {
    setItems((prev) => {
      const clean = names.map((x) => normalizePickedText(x)).filter(Boolean);
      if (clean.length === 0) return prev;

      const existing = new Set(prev.map((x) => normalizePickedText(x.item_name)).filter(Boolean));
      const toAdd = clean.filter((x) => !existing.has(x));
      if (toAdd.length === 0) return prev;

      const out = [...prev];

      // fill first blank row (if any)
      let iBlank = out.findIndex((r) => !normalizePickedText(r.item_name));
      let cursor = 0;

      if (iBlank >= 0) {
        out[iBlank] = { ...out[iBlank], item_name: toAdd[cursor] };
        cursor++;
      }

      for (; cursor < toAdd.length; cursor++) {
        out.push({ item_name: toAdd[cursor], qty: "", unit: "", notes: "" });
      }

      return out;
    });
  }

  // ✅ APPLY selection coming back from /rfq/general/browse/[module]
  useEffect(() => {
    // A) New richer payload support (picked=JSON)
    const pickedPayload = parsePickedPayload(sp.get("picked"));

    if (pickedPayload) {
      if (pickedPayload.module && pickedPayload.module !== module) {
        setModule(pickedPayload.module);
      }

      if (pickedPayload.mode === "other") {
        appendHintLines([pickedPayload.text]);
      } else {
        if (pickedPayload.applyAs === "hint") appendHintLines(pickedPayload.values);
        if (pickedPayload.applyAs === "item") addItemNames(pickedPayload.values);
      }

      setShowInlineModule(true);

      // clean URL so refresh doesn’t re-apply
      const clean = new URLSearchParams(sp.toString());
      clean.delete("picked");
      router.replace(`/rfq/general/new?${clean.toString()}`);
      return;
    }

    // B) Legacy: pick + pickMode
    const picked = normalizePickedText(sp.get("pick") || "");
    const pickedMode = (sp.get("pickMode") || "") as "hint" | "item" | "";
    const pickedModule = (sp.get("module") || "") as RfqModule | "";

    if (!picked || !pickedMode) return;

    if (isValidModule(pickedModule)) setModule(pickedModule);

    if (pickedMode === "hint") appendHintLines([picked]);
    if (pickedMode === "item") addItemNames([picked]);

    setShowInlineModule(true);

    const clean = new URLSearchParams(sp.toString());
    clean.delete("pick");
    clean.delete("pickMode");
    clean.delete("module");
    router.replace(`/rfq/general/new?${clean.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    const cleanTitle = title.trim();
    if (!cleanTitle) {
  const msg = "Title is required.";
  setErr(msg);
  showPopup(msg, "error");
  return;
}

    if (!city.trim() || !locality.trim() || !pincode.trim()) {
    const msg = "Location is required: City, Locality and Pincode.";
setErr(msg);
showPopup(msg, "error");
return;
    }

    const hasTyped = items.some((x) => x.item_name.trim() !== "");
    const hasFiles = files.length > 0;
    if (!hasTyped && !hasFiles) {
      const msg = "Please add at least one item OR upload a handwritten/PDF list.";
setErr(msg);
showPopup(msg, "error");
return;
    }

    const phone = contactPhone.trim();
    const email = contactEmail.trim();
    const whatsapp = contactWhatsapp.trim();
    if (!phone && !email) {
      const msg = "For public submission, please provide phone or email.";
setErr(msg);
showPopup(msg, "error");
return;
    }

    setLoading(true);
    try {
      // 1) Upload attachments
      const uploadedAttachments: Array<{
        bucket: string;
        object_path: string;
        file_name: string;
        mime_type: string | null;
        file_size: number | null;
      }> = [];

      if (files.length > 0) {
        const tempFolder = `public-${Date.now()}`;

        for (const f of files) {
          const safeName = f.name.replace(/[^\w.\-() ]+/g, "_");
          const objectPath = `${tempFolder}/${Date.now()}_${safeName}`;

          const up = await supabase.storage.from("rfq_attachments").upload(objectPath, f, {
            cacheControl: "3600",
            upsert: false,
            contentType: f.type || undefined,
          });

          if (up.error) throw up.error;

          uploadedAttachments.push({
            bucket: "rfq_attachments",
            object_path: objectPath,
            file_name: f.name,
            mime_type: f.type || null,
            file_size: f.size || null,
          });
        }
      }

      // 2) Typed items payload
      const typed = items
        .map((x, idx) => ({
          material_name: x.item_name.trim(),
          qty: safeNum(x.qty),
          unit: x.unit.trim() || null,
          notes: x.notes.trim() || null,
          sort_order: idx,
        }))
        .filter((x) => x.material_name);

      // 3) Create unified RFQ
      const res = await fetch("/api/rfq/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          title: cleanTitle,
          description: description.trim() || null,
          city: city.trim(),
          locality: locality.trim(),
          address: address.trim() || null,
          pincode: pincode.trim(),
          needed_by: neededBy ? neededBy : null,

          contact_name: contactName.trim() || null,
          contact_phone: phone || null,
          contact_email: email || null,
          contact_whatsapp: whatsapp || null,

          items: typed,
          attachments: uploadedAttachments,
        }),
      });

      const out = await res.json().catch(() => ({} as any));
      if (!res.ok || !out?.ok) throw new Error(out?.error || "RFQ create failed.");

      // ✅ clear draft on success
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}

      showPopup("RFQ submitted successfully 🎉", "success");

setTimeout(() => {
  router.push("/rfq/success");
}, 1200);
    } catch (e: any) {
  const msg = e?.message || "Something went wrong.";
  setErr(msg);
  showPopup(msg, "error");
  console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const hint = defaultTitleHint(module);

  const browseLink = `${browseHref(module)}?returnTo=${encodeURIComponent("/rfq/general/new")}&module=${encodeURIComponent(module)}`;

  return (
    <div className="container pageBody" style={{ paddingTop: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Submit Requirement (Unified RFQ)</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        Select module → describe requirement → add items/work or upload a handwritten/PDF list.
      </div>

      {err ? (
        <div
          style={{
            background: "#ffecec",
            border: "1px solid #ffb3b3",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      ) : null}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        {/* ✅ Module */}
        <div
          ref={moduleBoxRef}
          style={{
            border: flashModuleBox ? "2px solid #0b57d0" : "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            padding: 12,
            background: "rgba(16,185,129,0.06)",
            boxShadow: flashModuleBox ? "0 0 0 4px rgba(11,87,208,0.12)" : "none",
            transition: "all 180ms ease",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Requirement Type (module)</div>
          <div style={{ opacity: 0.8, marginBottom: 10 }}>
            This decides where the RFQ goes: Materials / Services / Rentals / Properties.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value as RfqModule)}
              style={{
                height: 40,
                borderRadius: 12,
                padding: "0 12px",
                border: "1px solid rgba(0,0,0,0.18)",
                fontWeight: 900,
                background: "#fff",
              }}
            >
              <option value="materials">Materials</option>
              <option value="services">Services</option>
              <option value="rentals">Rentals</option>
              <option value="properties">Properties</option>
            </select>

            <div style={{ opacity: 0.85, fontWeight: 800 }}>Selected: {moduleLabel(module)}</div>

            <Link className="topBtn topBtnGhost" href={browseLink}>
              Browse {moduleLabel(module)} →
            </Link>
          </div>

          <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
            Tip: After clicking <b>+ Add item</b>, confirm this module is correct before entering items.
          </div>
        </div>

        <label>
          <div style={{ fontWeight: 700 }}>Title *</div>
          <input className="searchInput" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={hint} />
        </label>

        <label>
          <div style={{ fontWeight: 700 }}>Description (write clearly)</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specs, brand preference, work details, service terms, delivery constraints, payment terms etc."
            style={{
              width: "100%",
              minHeight: 170,
              fontSize: 16,
              lineHeight: 1.55,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "#fff",
              outline: "none",
              resize: "vertical",
            }}
          />
          <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
            Tip: Use “Browse” above to quickly add category hints or items. (Hint → Description, Item → Typed items)
          </div>
        </label>

        {/* Location */}
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            padding: 12,
            background: "rgba(11,87,208,0.03)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Location (required)</div>
          <div style={{ opacity: 0.8, marginBottom: 10 }}>
            Enter City, Locality, Pincode so nearby vendors can quote.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <div style={{ fontWeight: 700 }}>City *</div>
              <input className="searchInput" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>

            <label>
              <div style={{ fontWeight: 700 }}>Locality *</div>
              <input className="searchInput" value={locality} onChange={(e) => setLocality(e.target.value)} />
            </label>

            <label>
              <div style={{ fontWeight: 700 }}>Pincode *</div>
              <input className="searchInput" value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </label>

            <label>
              <div style={{ fontWeight: 700 }}>Address (optional)</div>
              <input className="searchInput" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>

            <label>
              <div style={{ fontWeight: 700 }}>Needed by</div>
              <input className="searchInput" type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </label>
          </div>
        </div>

        {/* Typed items */}
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>Typed items / work (optional)</div>
              <div style={{ opacity: 0.8, marginTop: 4 }}>
                Example: “Labour for plastering”, “Aluminium fabrication”, “House wiring work”, etc.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="topBtn topBtnGhost"
                onClick={() => {
                  addItem();
                  setShowInlineModule(true);
                  focusModuleBox();
                }}
              >
                + Add item
              </button>
            </div>
          </div>

          {showInlineModule ? (
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: 12,
                padding: 10,
                background: "rgba(16,185,129,0.05)",
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Requirement Type (module)</div>
              <div style={{ opacity: 0.8, marginBottom: 8 }}>
                Confirm module here before typing items. (Synced with top module selector.)
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={module}
                  onChange={(e) => setModule(e.target.value as RfqModule)}
                  style={{
                    height: 38,
                    borderRadius: 12,
                    padding: "0 12px",
                    border: "1px solid rgba(0,0,0,0.18)",
                    fontWeight: 900,
                    background: "#fff",
                  }}
                >
                  <option value="materials">Materials</option>
                  <option value="services">Services</option>
                  <option value="rentals">Rentals</option>
                  <option value="properties">Properties</option>
                </select>

                <div style={{ opacity: 0.85, fontWeight: 800 }}>Selected: {moduleLabel(module)}</div>

                <Link className="topBtn topBtnGhost" href={browseLink}>
                  Browse {moduleLabel(module)} →
                </Link>

                <button type="button" className="topBtn topBtnGhost" onClick={() => focusModuleBox()}>
                  View top module box →
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 2fr auto",
                  gap: 8,
                }}
              >
                <input
                  className="searchInput"
                  value={it.item_name}
                  onChange={(e) => updateItem(idx, { item_name: e.target.value })}
                  placeholder="Item / Work / Service"
                />
                <input className="searchInput" value={it.qty} onChange={(e) => updateItem(idx, { qty: e.target.value })} placeholder="Qty" />
                <input className="searchInput" value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} placeholder="Unit" />
                <input
                  className="searchInput"
                  value={it.notes}
                  onChange={(e) => updateItem(idx, { notes: e.target.value })}
                  placeholder="Notes"
                />
                <button
                  type="button"
                  className="topBtn topBtnGhost"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Upload handwritten list / PDF / images (optional)</div>
          <input type="file" multiple accept=".pdf,image/*" onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} />
          <div style={{ opacity: 0.75, marginTop: 6 }}>Tip: take a clear photo of the handwritten list.</div>
        </div>

        {/* Contact */}
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Your Contact (required if not logged in)</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <input className="searchInput" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Name" />
            <input className="searchInput" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone" />
            <input className="searchInput" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" />
          </div>

          <div style={{ marginTop: 12 }}>
            <input
              className="searchInput"
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="WhatsApp number (optional)"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="topBtn topBtnPrimary" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit RFQ →"}
          </button>

          <button className="topBtn topBtnGhost" type="button" onClick={() => router.back()}>
            Back
          </button>

          <Link className="topBtn topBtnGhost" href="/">
            Home
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function RfqGeneralNewPage() {
  return (
    <Suspense fallback={<div className="container pageBody" style={{ paddingTop: 16 }}>Loading...</div>}>
      <RfqGeneralNewPageInner />
    </Suspense>
  );
}