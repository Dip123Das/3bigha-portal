// app/rfq/general/browse/[module]/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type RfqModule = "materials" | "services" | "rentals" | "properties";
type Group = { title: string; items: string[] };

const DATA: Record<RfqModule, Group[]> = {
  services: [
    {
      title: "Turnkey & Construction (Killing Part)",
      items: [
        "Turnkey house construction (complete package)",
        "House construction (labour + materials)",
        "Civil contractor / building contractor",
        "Boundary wall construction",
        "Demolition work",
        "Roofing / shed / structure work",
        "Waterproofing work",
        "Septic tank / soak pit",
        "Borewell / deep tubewell",
      ],
    },
    {
      title: "Professional Services",
      items: [
        "Architect / building design",
        "Engineer (civil / structural)",
        "Interior design consultation",
        "3D elevation / 3D plan",
        "Site supervision",
        "Vastu consultation",
        "Survey / measurement",
        "Estimate / BOQ preparation",
      ],
    },
    {
      title: "Legal & Documentation Services",
      items: [
        "Sale deed / registration assistance",
        "Agreement drafting (sale / rent / development)",
        "Land mutation / records correction",
        "Property verification / due diligence",
        "Court / legal case assistance",
        "NOC / permission assistance",
        "Loan / bank documentation help",
      ],
    },
    {
      title: "Skilled Work & Repairs",
      items: [
        "Electrical wiring",
        "Plumbing work",
        "Painting",
        "Mason / labour",
        "Tiles / flooring work",
        "False ceiling / POP / gypsum",
        "Aluminium / UPVC fabrication",
        "Carpentry / furniture work",
        "Welding / grill / gate work",
        "AC installation / repair",
        "CCTV / security systems",
        "Solar installation",
      ],
    },
  ],

  materials: [
    {
      title: "Core Construction Materials",
      items: ["Cement", "TMT / steel", "Sand", "Stone chips / aggregate", "Bricks", "Blocks (AAC / concrete)", "Ready-mix concrete (RMC)"],
    },
    {
      title: "Finishing Materials",
      items: ["Paint", "Tiles", "Sanitaryware", "Bath fittings", "Doors / windows", "Plywood / laminates", "Glass", "False ceiling materials"],
    },
    {
      title: "Electrical & Plumbing Materials",
      items: ["Wires / cables", "Switches / MCB / DB", "Lights / fans", "Pipes / fittings", "Water tank", "Pump / motor"],
    },
    {
      title: "Roofing / Structure / Hardware",
      items: [
        "Tin shed / roofing sheet",
        "MS angle / channel",
        "Cement board",
        "Nails / screws / fasteners",
        "Adhesive / chemical / waterproofing",
      ],
    },
  ],

  rentals: [
    { title: "Earthwork & Heavy Machines", items: ["JCB (with operator)", "Excavator", "Tractor (with trolley)", "Dumper / tipper"] },
    { title: "Concrete & Construction Tools", items: ["Concrete mixer", "Vibrator", "Plate compactor", "Water pump", "Generator"] },
    { title: "Shuttering & Scaffolding", items: ["Shuttering plates", "Props / spans", "Cuplock scaffolding", "Staging / bamboo scaffolding"] },
    { title: "Transport / Delivery Rentals", items: ["Pickup / mini truck", "Truck", "Loader / tempo"] },
  ],

  properties: [
    { title: "Buy", items: ["Buy land / plot", "Buy flat / apartment", "Buy house / villa", "Buy commercial shop", "Buy agriculture land"] },
    { title: "Rent / Lease", items: ["Rent house", "Rent flat", "Rent shop", "Rent office space", "Lease commercial space", "Warehouse / godown"] },
    {
      title: "Sell (assistance)",
      items: ["Sell land / plot (need buyers)", "Sell house (need buyers)", "Sell flat (need buyers)", "Sell commercial property (need buyers)"],
    },
    { title: "Property Requirements (special)", items: ["Need plot near a specific locality", "Need property within budget range", "Need urgent requirement"] },
  ],
};

function moduleLabel(m: RfqModule) {
  if (m === "materials") return "Materials";
  if (m === "services") return "Services";
  if (m === "rentals") return "Rentals";
  return "Properties";
}

function safeReturnTo(raw: string | null) {
  if (!raw) return "/rfq/general/new";
  if (!raw.startsWith("/")) return "/rfq/general/new";
  if (raw.startsWith("//")) return "/rfq/general/new";
  return raw;
}

function encodePicked(payload: any) {
  return encodeURIComponent(JSON.stringify(payload));
}

export default function RfqBrowseModulePage() {
  const router = useRouter();
  const params = useParams<{ module: string }>();
  const sp = useSearchParams();

  const raw = String(params?.module ?? "services").toLowerCase();
  const module = (["materials", "services", "rentals", "properties"].includes(raw) ? raw : "services") as RfqModule;

  const returnTo = safeReturnTo(sp.get("returnTo"));

  const [q, setQ] = useState("");
  const [other, setOther] = useState("");

  // ✅ Multi-select state (stores exact item text)
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => DATA[module] || [], [module]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map((g) => ({ ...g, items: g.items.filter((x) => x.toLowerCase().includes(query)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const allVisibleItems = useMemo(() => {
    const out: string[] = [];
    for (const g of filtered) out.push(...g.items);
    return out;
  }, [filtered]);

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  function goBackWithPicked(picked: string | null) {
    const u = new URL(returnTo, "http://local");
    if (picked) u.searchParams.set("picked", picked);
    router.push(u.pathname + (u.search || ""));
  }

  function sendValues(values: string[], applyAs: "hint" | "item") {
    const clean = values.map((x) => String(x || "").trim()).filter(Boolean);
    if (clean.length === 0) return;

    const payload = {
      mode: "typed",
      applyAs, // "hint" | "item"
      values: clean,
      module,
    };
    goBackWithPicked(encodePicked(payload));
  }

  function pickSingle(value: string, applyAs: "hint" | "item") {
    sendValues([value], applyAs);
  }

  function pickOther(applyAs: "hint" | "item") {
    const v = other.trim();
    if (!v) return;

    if (applyAs === "item") {
      sendValues([v], "item");
      return;
    }

    const payload = { mode: "other", text: v, module };
    goBackWithPicked(encodePicked(payload));
  }

  function toggleItem(x: string) {
    setSelected((prev) => ({ ...prev, [x]: !prev[x] }));
  }

  function clearSelection() {
    setSelected({});
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = { ...prev };
      for (const x of allVisibleItems) next[x] = true;
      return next;
    });
  }

  function unselectAllVisible() {
    setSelected((prev) => {
      const next = { ...prev };
      for (const x of allVisibleItems) delete next[x];
      return next;
    });
  }

  function addSelectedAs(applyAs: "hint" | "item") {
    const values = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    sendValues(values, applyAs);
  }

  return (
    <div className="container pageBody" style={{ paddingTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Browse for RFQ • {moduleLabel(module)}</h1>
        <Link className="topBtn topBtnGhost" href={returnTo}>
          Back to RFQ →
        </Link>
      </div>

      <div style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.5 }}>
        Tick multiple options and add them together as <b>Hint</b> (Description) or <b>Item</b> (Typed items).
      </div>

      {/* Search */}
      <div style={{ marginTop: 14 }}>
        <input className="searchInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search inside ${moduleLabel(module)}…`} />
      </div>

      {/* Selection toolbar */}
      <div
        style={{
          marginTop: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          padding: 12,
          background: "rgba(11,87,208,0.03)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 900 }}>
          Selected: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{selectedCount}</span>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="topBtn topBtnGhost" onClick={selectAllVisible} title="Select all visible results">
            Select all (visible)
          </button>
          <button type="button" className="topBtn topBtnGhost" onClick={unselectAllVisible} title="Unselect all visible results">
            Unselect all (visible)
          </button>
          <button type="button" className="topBtn topBtnGhost" onClick={clearSelection} title="Clear selection">
            Clear
          </button>

          <button type="button" className="topBtn topBtnGhost" onClick={() => addSelectedAs("hint")} disabled={selectedCount === 0}>
            Add Selected as Hint →
          </button>
          <button type="button" className="topBtn topBtnPrimary" onClick={() => addSelectedAs("item")} disabled={selectedCount === 0}>
            Add Selected as Item →
          </button>
        </div>
      </div>

      {/* Groups */}
      <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
        {filtered.length === 0 ? (
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14, background: "rgba(11,87,208,0.03)" }}>
            No results found. Use “Other (specify)” below.
          </div>
        ) : (
          filtered.map((g) => (
            <div key={g.title} style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14, background: "#fff" }}>
              <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 10 }}>{g.title}</div>

              <div style={{ display: "grid", gap: 10 }}>
                {g.items.map((x) => {
                  const isChecked = !!selected[x];
                  return (
                    <div
                      key={x}
                      style={{
                        border: "1px solid rgba(0,0,0,0.12)",
                        borderRadius: 12,
                        padding: 12,
                        background: isChecked ? "rgba(16,185,129,0.10)" : "rgba(11,87,208,0.03)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Left: checkbox + label */}
                      <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 240, cursor: "pointer" }}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleItem(x)} />
                        <div style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.3 }}>{x}</div>
                      </label>

                      {/* Right: quick single add buttons (kept) */}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" className="topBtn topBtnGhost" onClick={() => pickSingle(x, "hint")} title="Add only this to Description">
                          Add as Hint →
                        </button>
                        <button type="button" className="topBtn topBtnPrimary" onClick={() => pickSingle(x, "item")} title="Add only this to Typed items">
                          Add as Item →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Other */}
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14, background: "rgba(16,185,129,0.06)" }}>
          <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 10 }}>Other (specify)</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="searchInput"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder={`Write your ${moduleLabel(module)} requirement in your words…`}
              style={{ flex: 1, minWidth: 260 }}
            />

            <button type="button" className="topBtn topBtnGhost" onClick={() => pickOther("hint")}>
              Add as Hint →
            </button>
            <button type="button" className="topBtn topBtnPrimary" onClick={() => pickOther("item")}>
              Add as Item →
            </button>
          </div>

          <div style={{ opacity: 0.75, marginTop: 8, lineHeight: 1.5 }}>
            Example: “Urgent electrician for 2BHK wiring”, “Need 3 katha plot near Khagrabari”, “JCB for 6 hours”.
          </div>
        </div>

        {/* Back */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="topBtn topBtnGhost" onClick={() => goBackWithPicked(null)}>
            Back to RFQ (no selection) →
          </button>
        </div>
      </div>
    </div>
  );
}