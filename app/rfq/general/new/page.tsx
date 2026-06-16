// app/rfq/general/new/page.tsx
"use client";

import ProjectWorkflowHub from "@/components/project/ProjectWorkflowHub";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import ProcurementCopilotBox from "@/app/components/ai/ProcurementCopilotBox";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import {
  estimateConstructionCost,
  formatIndianCurrency,
} from "@/lib/construction-cost/cost-utils";
import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";
import WorkflowContinuityBar from "@/components/workflow-continuity/WorkflowContinuityBar";
import WorkflowContinuityRecorder from "@/components/workflow-continuity/WorkflowContinuityRecorder";
import OperationalEventStream from "@/components/operational-events/OperationalEventStream";
import OperationalEventRecorder from "@/components/operational-events/OperationalEventRecorder";

type RfqModule = "materials" | "services" | "rentals" | "properties";

type ItemRow = {
  item_name: string;
  qty: string;
  unit: string;
  notes: string;
};

type AiVendorMatch = {
  user_id?: string;
  name: string;
  reason: string;
  score: number;
  city?: string;
  locality?: string;
  district?: string;
  pincode?: string;
  source?: string;
};

type SupplierRecommendationCard = AiVendorMatch & {
  rank: number;
  deliveryConfidence: "High" | "Medium" | "Low";
  pricingConfidence: "High" | "Medium" | "Low";
  negotiationReadiness: "Ready" | "Needs RFQ details";
  aiStrength: string;
  shortlistReason: string;
};

type RfqIntelligenceResult = {
  ok?: boolean;
  source?: string;
  rfqHealthScore?: number;
  expectedVendorReplies?: string;
  expectedClosureProbability?: number;
  missingInformation?: string[];
  urgencyAnalysis?: string;
  budgetRealism?: string;
  improvementSuggestions?: string[];
  recommendedAction?: string;
  aiSummary?: string;
};

type ProcurementMemoryItem = {
  id: string;
  module: RfqModule;
  title: string;
  summary: string;
  city?: string;
  locality?: string;
  pincode?: string;
  createdAt: string;
};

type LiveProcurementSuggestion = {
  label: string;
  value: string;
  action: "description" | "item" | "location" | "timeline" | "budget";
};

type ProcurementReadinessInsight = {
  readinessScore: number;
  completionPercent: number;
  complexityLevel: "Low" | "Medium" | "High";
  urgencyLevel: "Normal" | "Urgent" | "Critical";
  deliveryRisk: "Low" | "Medium" | "High";
  timelineEstimate: string;
  expectedVendorResponse: string;
  missingFields: string[];
  nextMilestone: string;
};

type AiAutocompleteSuggestion = {
  completion: string;
  confidence: number;
};

type SmartScopeInsight = {
  technicalKeywords: string[];
  commercialTerms: string[];
  riskFlags: string[];
  procurementStrategy: string;
};

type StructuredRfqBlock = {
  scope: string;
  deliverables: string[];
  technicalRequirements: string[];
  commercialTerms: string[];
  vendorExpectations: string[];
  timeline: string;
};

type ProcurementReasoningItem = {
  title: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "red" | "purple";
};

type ProcurementRecommendationCard = {
  title: string;
  detail: string;
  actionText: string;
  applyText: string;
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

const RFQ_PROGRESS_STEPS = [
  "Requirement",
  "Location",
  "Items",
  "Contact",
  "Submit",
];

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
const PROCUREMENT_MEMORY_KEY = "rfq_procurement_conversation_memory_v1";

function RfqGeneralNewPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(false);

  const [aiRequirement, setAiRequirement] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);
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
  const [mediaAssets, setMediaAssets] = useState<UploadedMediaAsset[]>([]);

  const [aiAutoFillApplied, setAiAutoFillApplied] = useState(false);
  const [aiAutoFillSummary, setAiAutoFillSummary] = useState("");

  const [aiVendorMatches, setAiVendorMatches] = useState<AiVendorMatch[]>([]);

  const [rfqAiLoading, setRfqAiLoading] = useState(false);
  const [rfqAi, setRfqAi] = useState<RfqIntelligenceResult | null>(null);
  const [rfqAiError, setRfqAiError] = useState("");

  const [procurementMemory, setProcurementMemory] = useState<ProcurementMemoryItem[]>([]);
  const [liveSuggestions, setLiveSuggestions] = useState<LiveProcurementSuggestion[]>([]);
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [negotiationCoach, setNegotiationCoach] = useState("");

  const [showConstructionBudget, setShowConstructionBudget] = useState(false);
  const [constructionAreaSqFt, setConstructionAreaSqFt] = useState(1000);
  const [constructionFloorCount, setConstructionFloorCount] = useState(1);
  const [constructionGrade, setConstructionGrade] =
    useState<ConstructionGrade>("standard");

  const [aiAutocomplete, setAiAutocomplete] =
    useState<AiAutocompleteSuggestion | null>(null);

  const [scopeInsight, setScopeInsight] =
    useState<SmartScopeInsight | null>(null);

  const [autocompleteLoading, setAutocompleteLoading] =
    useState(false);

  const [showAiRfqAssistant, setShowAiRfqAssistant] =
    useState(false);

  const [showSupplierIntel, setShowSupplierIntel] =
    useState(false);

  const [showProcurementReadiness, setShowProcurementReadiness] =
    useState(false);

  const [showStructuredRfq, setShowStructuredRfq] =
    useState(false);

  const [showProgressiveBuilder, setShowProgressiveBuilder] =
    useState(false);

  const [quickNeed, setQuickNeed] = useState("");
  const [quickLocation, setQuickLocation] = useState("");
  const [quickQty, setQuickQty] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);

  const [structuredRfq, setStructuredRfq] =
    useState<StructuredRfqBlock | null>(null);

  const [procurementReasoning, setProcurementReasoning] =
    useState<ProcurementReasoningItem[]>([]);

  const [procurementRecommendations, setProcurementRecommendations] =
    useState<ProcurementRecommendationCard[]>([]);

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

  // ✅ Load persistent procurement memory
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROCUREMENT_MEMORY_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      if (Array.isArray(rows)) {
        setProcurementMemory(rows.slice(0, 8));
      }
    } catch {
      setProcurementMemory([]);
    }
  }, []);

  useEffect(() => {
  const combined = `
${aiRequirement}
${title}
${description}
${items
  .map((x) => `${x.item_name} ${x.qty} ${x.unit} ${x.notes}`)
  .join(" ")}
`
    .trim()
    .toLowerCase();

  if (combined.length < 20) {
    setAiAutocomplete(null);
    setScopeInsight(null);
    return;
  }

  const timer = window.setTimeout(async () => {
    try {
      setAutocompleteLoading(true);

      const technicalKeywords: string[] = [];
      const commercialTerms: string[] = [];
      const riskFlags: string[] = [];

      const technicalMap = [
        "cement",
        "tmt",
        "rod",
        "steel",
        "plumbing",
        "electrical",
        "tile",
        "paint",
        "excavator",
        "jcb",
        "labour",
        "wiring",
        "concrete",
        "sand",
        "brick",
      ];

      technicalMap.forEach((k) => {
        if (combined.includes(k)) {
          technicalKeywords.push(k);
        }
      });

      if (
        combined.includes("urgent") ||
        combined.includes("immediate")
      ) {
        commercialTerms.push("Urgent procurement");
      }

      if (
        combined.includes("gst") ||
        combined.includes("invoice")
      ) {
        commercialTerms.push("GST billing required");
      }

      if (
        combined.includes("delivery")
      ) {
        commercialTerms.push("Delivery commitment");
      }

      if (!pincode.trim()) {
        riskFlags.push("Pincode missing");
      }

      if (
        !neededBy &&
        combined.length > 60
      ) {
        riskFlags.push("Timeline missing");
      }

      if (
        items.filter((x) => x.item_name.trim()).length === 0
      ) {
        riskFlags.push("No structured items added");
      }

      let completion = "";

      if (
        technicalKeywords.includes("cement")
      ) {
        completion =
          "Please quote OPC/PPC grade, delivery timeline, unloading charges and GST invoice availability.";
      } else if (
        technicalKeywords.includes("jcb")
      ) {
        completion =
          "Please mention machine capacity, operator availability, diesel inclusion and working hours.";
      } else if (
        technicalKeywords.includes("electrical")
      ) {
        completion =
          "Please confirm wiring brand, load requirement, labour scope and completion timeline.";
      } else if (
        technicalKeywords.includes("plumbing")
      ) {
        completion =
          "Please specify pipe brand, bathroom/kitchen points and fitting scope.";
      } else {
        completion =
          "Please confirm final delivery timeline, warranty/support and payment terms.";
      }

      setAiAutocomplete({
        completion,
        confidence:
          combined.length > 120 ? 92 : 76,
      });

      setScopeInsight({
        technicalKeywords,
        commercialTerms,
        riskFlags,
        procurementStrategy:
          technicalKeywords.length >= 3
            ? "Multi-vendor comparison is recommended."
            : "Fast local vendor response is recommended.",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setAutocompleteLoading(false);
    }
  }, 700);

  return () => window.clearTimeout(timer);
}, [
  aiRequirement,
  title,
  description,
  items,
  pincode,
  neededBy,
]);

  // ✅ Live procurement suggestions while typing
  useEffect(() => {
    const text = `${aiRequirement} ${title} ${description} ${items
      .map((x) => `${x.item_name} ${x.qty} ${x.unit} ${x.notes}`)
      .join(" ")}`.toLowerCase();

    const next: LiveProcurementSuggestion[] = [];

    if (text.trim().length > 8 && !description.trim()) {
      next.push({
        label: "Add clear requirement description",
        value: aiRequirement || title,
        action: "description",
      });
    }

    if (text.includes("cement") && !items.some((x) => x.item_name.toLowerCase().includes("cement"))) {
      next.push({
        label: "Add cement as RFQ item",
        value: "Cement",
        action: "item",
      });
    }

    if ((text.includes("rod") || text.includes("steel")) && !items.some((x) => x.item_name.toLowerCase().includes("steel"))) {
      next.push({
        label: "Add steel/rod as RFQ item",
        value: "Steel rod",
        action: "item",
      });
    }

    if ((text.includes("jcb") || text.includes("excavator")) && module !== "rentals") {
      next.push({
        label: "Switch module to Rentals",
        value: "rentals",
        action: "location",
      });
    }

    if ((text.includes("electric") || text.includes("plumbing") || text.includes("labour")) && module !== "services") {
      next.push({
        label: "Switch module to Services",
        value: "services",
        action: "location",
      });
    }

    if (!neededBy && text.trim().length > 15) {
      next.push({
        label: "Add delivery/work timeline",
        value: "Please mention expected delivery or work completion date.",
        action: "timeline",
      });
    }

    if (!city.trim() || !locality.trim() || !pincode.trim()) {
      next.push({
        label: "Complete location for better vendor matching",
        value: "City, locality and pincode improve nearby vendor discovery.",
        action: "location",
      });
    }

    const itemCount = items.filter((x) => x.item_name.trim()).length;
    const qtyTotal = items.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);

    if (itemCount > 0 || qtyTotal > 0) {
      const rough = qtyTotal > 0 ? `Approx budget depends on live vendor quote. Quantity detected: ${qtyTotal}.` : "Approx budget will improve after quantity is added.";
      setEstimatedBudget(rough);
    } else {
      setEstimatedBudget("");
    }

    if (text.trim().length > 20) {
      setNegotiationCoach(
        "Ask vendors to confirm final price, delivery timeline, GST/invoice terms, warranty/service support and payment milestone before closing."
      );
    } else {
      setNegotiationCoach("");
    }

    setLiveSuggestions(next.slice(0, 6));
  }, [aiRequirement, title, description, items, module, city, locality, pincode, neededBy]);

  function applyLiveSuggestion(s: LiveProcurementSuggestion) {
    if (s.action === "description") {
      setDescription((prev) => {
        const base = prev.trim();
        if (!base) return s.value;
        if (base.includes(s.value)) return base;
        return `${base}\n${s.value}`;
      });
      return;
    }

    if (s.action === "item") {
      addItemNames([s.value]);
      setShowInlineModule(true);
      return;
    }

    if (s.action === "timeline") {
      setDescription((prev) => {
        const base = prev.trim();
        const line = "Expected timeline: please quote fastest possible delivery/work completion.";
        if (base.includes(line)) return base;
        return base ? `${base}\n${line}` : line;
      });
      return;
    }

    if (s.action === "location") {
      if (s.value === "rentals" || s.value === "services" || s.value === "materials" || s.value === "properties") {
        setModule(s.value as RfqModule);
      } else {
        showPopup(s.value, "success");
      }
      return;
    }
  }

  function saveProcurementMemory() {
    const cleanTitle = title.trim() || aiRequirement.trim().slice(0, 80) || "Procurement RFQ";
    const summary =
      description.trim() ||
      aiRequirement.trim() ||
      items.map((x) => [x.item_name, x.qty, x.unit].filter(Boolean).join(" ")).filter(Boolean).join(", ");

    const row: ProcurementMemoryItem = {
      id: `${Date.now()}`,
      module,
      title: cleanTitle,
      summary: summary.slice(0, 240),
      city: city.trim() || undefined,
      locality: locality.trim() || undefined,
      pincode: pincode.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const next = [row, ...procurementMemory].slice(0, 8);
    setProcurementMemory(next);

    try {
      localStorage.setItem(PROCUREMENT_MEMORY_KEY, JSON.stringify(next));
    } catch {}

    showPopup("Procurement memory saved.", "success");
  }

  function applyMemoryToRfq(row: ProcurementMemoryItem) {
    setModule(row.module);
    setTitle(row.title);
    setDescription(row.summary);
    if (row.city) setCity(row.city);
    if (row.locality) setLocality(row.locality);
    if (row.pincode) setPincode(row.pincode);
    setAiAutoFillApplied(true);
    setAiAutoFillSummary("Previous procurement memory applied.");
    showPopup("Previous procurement memory applied.", "success");
  }

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

  // ✅ Apply AI auto-fill from homepage command bar
  useEffect(() => {
    const query = normalizePickedText(sp.get("query") || "");
    const item = normalizePickedText(sp.get("item") || "");
    const quantity = normalizePickedText(sp.get("quantity") || "");
    const unit = normalizePickedText(sp.get("unit") || "");
    const urgency = normalizePickedText(sp.get("urgency") || "");
    const location = normalizePickedText(sp.get("location") || "");

    if (!query && !item && !quantity && !urgency && !location) return;

    setModule("materials");

    if (query && !title.trim()) {
      setTitle(query.length > 70 ? `${query.slice(0, 70)}...` : query);
    }

    if (query && !description.trim()) {
      setDescription(`AI drafted requirement from homepage:\n${query}`);
    }

    if (item || quantity || unit) {
      setItems([
        {
          item_name: item || "",
          qty: quantity || "",
          unit: unit || "",
          notes: urgency === "urgent" ? "Urgent requirement" : "",
        },
      ]);
      setShowInlineModule(true);
    }

    if (location && !city.trim() && !locality.trim()) {
      setCity(location);
    }

    const summaryParts = [
      item ? `Item: ${item}` : "",
      quantity ? `Qty: ${quantity}` : "",
      unit ? `Unit: ${unit}` : "",
      urgency === "urgent" ? "Urgency: urgent" : "",
      location ? `Location: ${location}` : "",
    ].filter(Boolean);

    setAiAutoFillApplied(true);
    setAiAutoFillSummary(summaryParts.join(" • ") || "Homepage requirement applied");

    const clean = new URLSearchParams(sp.toString());
    clean.delete("query");
    clean.delete("item");
    clean.delete("quantity");
    clean.delete("unit");
    clean.delete("urgency");
    clean.delete("location");
    router.replace(`/rfq/general/new?${clean.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

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

    async function generateAiRfqDraft() {
    try {
      if (!aiRequirement.trim()) {
        showPopup("Please describe your requirement.", "error");
        return;
      }

      setAiDrafting(true);

      const res = await fetch("/api/ai/rfq-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: aiRequirement,
        }),
      });

      const json = await res.json();
      const rfq =
        json?.rfq ||
        (Array.isArray(json?.items)
          ? {
              title: aiRequirement.slice(0, 80),
              intent: aiRequirement,
              category: "General Procurement",
              items: json.items,
            }
          : null);

      if (!rfq) {
        showPopup("AI could not generate RFQ.", "error");
        return;
      }

      if (rfq.title) setTitle(rfq.title);
      if (rfq.intent) {
        setDescription(rfq.intent);

        if (!title || title.trim().length < 5) {
          setTitle(rfq.intent.slice(0, 80));
        }
      }

      if (Array.isArray(rfq.items) && rfq.items.length > 0) {
        setItems(
          rfq.items.map((item: any) => ({
            item_name: String(item.item || ""),
            qty: item.qty != null ? String(item.qty) : "",
            unit: String(item.unit || ""),
            notes: "",
          }))
        );
      }

      setAiAutoFillApplied(true);

      setAiAutoFillSummary(
        rfq.intent ||
          `AI detected procurement requirement for ${
            rfq.category || "marketplace procurement"
          }.`
      );

      setShowInlineModule(true);

      if (rfq.category) {
        const normalized = String(rfq.category).toLowerCase();

        if (
          normalized.includes("material") ||
          normalized.includes("cement") ||
          normalized.includes("steel")
        ) {
          setModule("materials");
        } else if (
          normalized.includes("service") ||
          normalized.includes("electrical") ||
          normalized.includes("plumbing")
        ) {
          setModule("services");
        } else if (
          normalized.includes("rental")
        ) {
          setModule("rentals");
        } else if (
          normalized.includes("property") ||
          normalized.includes("construction")
        ) {
          // Keep current module because this RFQ page does not support property/general module.
        }
      }

      showPopup("AI RFQ draft generated successfully.", "success");
      const searchText =
        rfq.title ||
        rfq.intent ||
        aiRequirement;

      const discoveryUrl =
        `/vendor/discovery?q=${encodeURIComponent(searchText)}`;

      setTimeout(() => {
        window.open(discoveryUrl, "_blank");
      }, 1200);
    } catch (error) {
      console.error(error);
      showPopup("AI RFQ drafting failed.", "error");
    } finally {
      setAiDrafting(false);
    }
  }

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
    const hasFiles = mediaAssets.length > 0;
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
      // 1) Attachments are already uploaded by UniversalMediaUploader
      const uploadedAttachments = mediaAssets.map((asset) => ({
        bucket: asset.bucket,
        object_path: asset.path,
        file_name: asset.name,
        mime_type: asset.mimeType || null,
        file_size: asset.size || null,
        public_url: asset.url,
        media_kind: asset.kind,
      }));

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

      if (out?.auto_chat_created && out?.autoConversationId) {
        const vendorName =
          typeof out?.autoChatVendorName === "string" && out.autoChatVendorName.trim()
            ? out.autoChatVendorName.trim()
            : "matched vendor";

        showPopup(`RFQ submitted successfully.\nConnecting you to ${vendorName}...`);

        const safeChatUrl =
          typeof out?.autoChatUrl === "string" && out.autoChatUrl.trim()
            ? out.autoChatUrl.trim()
            : typeof out?.autoConversationId === "string" && out.autoConversationId.trim()
              ? `/dashboard/thread/${encodeURIComponent(out.autoConversationId.trim())}`
              : typeof out?.rfqId === "string" && out.rfqId.trim()
                ? `/dashboard/buyer/quote-compare/${encodeURIComponent(out.rfqId.trim())}`
                : "/dashboard/buyer/rfqs";

        router.push(safeChatUrl);
      } else {
        showPopup("RFQ submitted successfully. Vendors will be notified shortly.");

        const safeRfqUrl =
          typeof out?.rfqId === "string" && out.rfqId.trim()
            ? `/dashboard/buyer/quote-compare/${encodeURIComponent(out.rfqId.trim())}`
            : "/dashboard/buyer/rfqs";

        router.push(safeRfqUrl);
      }
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

  const primaryItem = normalizePickedText(items.find((x) => normalizePickedText(x.item_name))?.item_name || "");

  useEffect(() => {
    const item = normalizePickedText(primaryItem);
    const place = normalizePickedText(locality || city || pincode);

    if (!item && !place) {
      setAiVendorMatches([]);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("module", module);
        if (item) params.set("item", item);
        if (city) params.set("city", city);
        if (locality) params.set("locality", locality);
        if (pincode) params.set("pincode", pincode);

        const res = await fetch(`/api/rfq/vendor-matches?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setAiVendorMatches([]);
          return;
        }

        const rows = Array.isArray(json?.matches) ? json.matches : [];
        setAiVendorMatches(rows.slice(0, 5));
      } catch {
        setAiVendorMatches([]);
      }
    }, 300);

    return () => window.clearTimeout(t);
  }, [module, primaryItem, city, locality, pincode]);

  useEffect(() => {
    const hasUsefulInput =
      title.trim() ||
      description.trim() ||
      city.trim() ||
      locality.trim() ||
      pincode.trim() ||
      items.some((x) => x.item_name.trim() || x.qty.trim() || x.unit.trim() || x.notes.trim());

    if (!hasUsefulInput) {
      setRfqAi(null);
      setRfqAiError("");
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        setRfqAiLoading(true);
        setRfqAiError("");

        const res = await fetch("/api/ai/rfq-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            module,
            category: primaryItem || moduleLabel(module),
            title,
            description,
            city,
            locality,
            pincode,
            quantity: items
              .map((x) => [x.item_name, x.qty, x.unit].filter(Boolean).join(" "))
              .filter(Boolean)
              .join(", "),
            urgency: neededBy ? `Needed by ${neededBy}` : null,
            items,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json) {
          setRfqAi(null);
          setRfqAiError(json?.error || "RFQ Intelligence failed.");
          return;
        }

        setRfqAi(json);
      } catch (e: any) {
        setRfqAi(null);
        setRfqAiError(e?.message || "RFQ Intelligence failed.");
      } finally {
        setRfqAiLoading(false);
      }
    }, 700);

    return () => window.clearTimeout(t);
  }, [module, title, description, city, locality, pincode, neededBy, items, primaryItem]);

  const rfqHealthScore = Number(rfqAi?.rfqHealthScore || 0);
  const rfqHealthTone =
    rfqHealthScore >= 75 ? "#16a34a" : rfqHealthScore >= 50 ? "#d97706" : "#dc2626";

  const supplierRecommendationCards = useMemo<SupplierRecommendationCard[]>(() => {
    return aiVendorMatches.slice(0, 5).map((v, idx) => {
      const score = Number(v.score || 0);
      const hasNearbyLocation = Boolean(v.locality || v.city || v.pincode);
      const hasStrongRfq = rfqHealthScore >= 70;

      return {
        ...v,
        rank: idx + 1,
        deliveryConfidence: score >= 80 && hasNearbyLocation ? "High" : score >= 60 ? "Medium" : "Low",
        pricingConfidence: score >= 75 && hasStrongRfq ? "High" : score >= 55 ? "Medium" : "Low",
        negotiationReadiness: hasStrongRfq ? "Ready" : "Needs RFQ details",
        aiStrength:
          idx === 0
            ? "Best overall match"
            : score >= 75
              ? "Strong local supplier"
              : score >= 55
                ? "Useful backup option"
                : "Needs manual verification",
        shortlistReason:
          score >= 80
            ? "Suggested first shortlist based on location, relevance and match quality."
            : score >= 60
              ? "Keep this supplier as a comparison option."
              : "Check this supplier after stronger matches respond.",
      };
    });
  }, [aiVendorMatches, rfqHealthScore]);

  const bestSupplier = supplierRecommendationCards[0];

    const smartProgress = useMemo(() => {
    let current = 1;

    const hasRequirement =
      title.trim() ||
      description.trim() ||
      aiRequirement.trim();

    const hasLocation =
      city.trim() &&
      locality.trim() &&
      pincode.trim();

    const hasItems =
      items.some((x) => x.item_name.trim()) ||
      mediaAssets.length > 0;

    const hasContact =
      contactPhone.trim() ||
      contactEmail.trim();

    if (hasRequirement) current = 2;
    if (hasRequirement && hasLocation) current = 3;
    if (hasRequirement && hasLocation && hasItems) current = 4;
    if (hasRequirement && hasLocation && hasItems && hasContact) current = 5;

    return {
      current,
      percent: Math.round((current / RFQ_PROGRESS_STEPS.length) * 100),
    };
  }, [
    title,
    description,
    aiRequirement,
    city,
    locality,
    pincode,
    items,
    mediaAssets,
    contactPhone,
    contactEmail,
  ]);

    const procurementInsight = useMemo<ProcurementReadinessInsight>(() => {
    const filledItems = items.filter((x) => x.item_name.trim()).length;
    const hasQty = items.some((x) => x.qty.trim());
    const hasUnit = items.some((x) => x.unit.trim());
    const hasLocation = Boolean(city.trim() && locality.trim() && pincode.trim());
    const hasContact = Boolean(contactPhone.trim() || contactEmail.trim());
    const hasTimeline = Boolean(neededBy);
    const hasDescription = description.trim().length >= 20;
    const hasVendorMatches = supplierRecommendationCards.length > 0;

    const checks = [
      Boolean(title.trim()),
      hasDescription,
      filledItems > 0 || mediaAssets.length > 0,
      hasQty,
      hasUnit,
      hasLocation,
      hasContact,
      hasTimeline,
      hasVendorMatches,
    ];

    const completionPercent = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    const readinessScore = Math.round((completionPercent + Math.min(100, rfqHealthScore || 0)) / 2);

    const totalQty = items.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);
    const complexityLevel =
      filledItems >= 4 || mediaAssets.length >= 2 || totalQty >= 500 ? "High" : filledItems >= 2 || totalQty >= 100 ? "Medium" : "Low";

    const today = new Date();
    const needed = neededBy ? new Date(neededBy) : null;
    const daysLeft = needed ? Math.ceil((needed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const urgencyLevel = daysLeft != null && daysLeft <= 2 ? "Critical" : daysLeft != null && daysLeft <= 7 ? "Urgent" : "Normal";

    const deliveryRisk =
      !hasLocation || urgencyLevel === "Critical" || readinessScore < 45
        ? "High"
        : urgencyLevel === "Urgent" || readinessScore < 70
          ? "Medium"
          : "Low";

    const missingFields = [
      !title.trim() ? "RFQ title" : "",
      !hasDescription ? "Clear description/specification" : "",
      filledItems === 0 && mediaAssets.length === 0 ? "At least one item/work or uploaded list" : "",
      !hasQty ? "Quantity" : "",
      !hasUnit ? "Unit" : "",
      !hasLocation ? "City, locality and pincode" : "",
      !hasTimeline ? "Expected delivery/work date" : "",
      !hasContact ? "Phone or email" : "",
    ].filter(Boolean);

    return {
      readinessScore,
      completionPercent,
      complexityLevel,
      urgencyLevel,
      deliveryRisk,
      timelineEstimate:
        urgencyLevel === "Critical"
          ? "Immediate vendor response required. Same-day or next-day coordination may be needed."
          : urgencyLevel === "Urgent"
            ? "Expected procurement cycle: 2–7 days depending on vendor availability."
            : "Expected procurement cycle: 7–15 days for quote comparison, negotiation and confirmation.",
      expectedVendorResponse:
        readinessScore >= 75
          ? "High chance of quick vendor response."
          : readinessScore >= 50
            ? "Moderate response expected. Add missing details for better quotes."
            : "Low response quality expected until key details are completed.",
      missingFields,
      nextMilestone:
        missingFields.length > 0
          ? `Complete: ${missingFields[0]}`
          : hasVendorMatches
            ? "Submit RFQ and compare vendor replies."
            : "Submit RFQ to activate vendor discovery.",
    };
  }, [
    items,
    mediaAssets.length,
    city,
    locality,
    pincode,
    contactPhone,
    contactEmail,
    neededBy,
    description,
    title,
    supplierRecommendationCards.length,
    rfqHealthScore,
  ]);

    useEffect(() => {
    const filledItems = items.filter((x) => x.item_name.trim());
    const itemNames = filledItems.map((x) => x.item_name.trim()).filter(Boolean);
    const qtyLine = filledItems
      .map((x) => [x.item_name, x.qty, x.unit].filter(Boolean).join(" "))
      .filter(Boolean)
      .join(", ");

    const combinedText = [
      aiRequirement,
      title,
      description,
      itemNames.join(", "),
      qtyLine,
      city,
      locality,
      pincode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (combinedText.trim().length < 25) {
      setStructuredRfq(null);
      setProcurementReasoning([]);
      setProcurementRecommendations([]);
      return;
    }

    const technicalRequirements: string[] = [];
    const commercialTerms: string[] = [];
    const vendorExpectations: string[] = [];
    const deliverables: string[] = [];

    if (combinedText.includes("cement")) {
      technicalRequirements.push("Confirm cement type/grade such as OPC/PPC and brand availability.");
      deliverables.push("Cement supply with loading/unloading and delivery confirmation.");
    }

    if (combinedText.includes("steel") || combinedText.includes("rod") || combinedText.includes("tmt")) {
      technicalRequirements.push("Confirm TMT/steel grade, diameter, weight basis and brand.");
      deliverables.push("Steel/TMT supply with verified weight and invoice.");
    }

    if (combinedText.includes("sand")) {
      technicalRequirements.push("Confirm sand type, source, vehicle load size and moisture condition.");
      deliverables.push("Sand delivery at buyer location.");
    }

    if (combinedText.includes("brick")) {
      technicalRequirements.push("Confirm brick type, size, quality and delivery vehicle capacity.");
      deliverables.push("Brick supply with quantity verification.");
    }

    if (combinedText.includes("jcb") || combinedText.includes("excavator")) {
      technicalRequirements.push("Confirm machine type, operator, diesel inclusion, hourly/daily rate and working hours.");
      deliverables.push("Rental equipment deployment with operator and site timing confirmation.");
    }

    if (combinedText.includes("electrical") || combinedText.includes("wiring")) {
      technicalRequirements.push("Confirm wire brand, load requirement, switch/socket scope and labour inclusion.");
      deliverables.push("Electrical work execution with material/labour scope clarity.");
    }

    if (combinedText.includes("plumbing")) {
      technicalRequirements.push("Confirm pipe brand, fitting points, labour scope and leakage responsibility.");
      deliverables.push("Plumbing work execution with point-wise quotation.");
    }

    if (combinedText.includes("labour")) {
      technicalRequirements.push("Confirm labour count, daily rate, scope boundary and supervision responsibility.");
      deliverables.push("Labour deployment as per agreed work scope.");
    }

    if (neededBy) {
      commercialTerms.push(`Expected delivery/work completion date: ${neededBy}.`);
    } else {
      commercialTerms.push("Vendor must confirm fastest possible delivery/work completion timeline.");
    }

    commercialTerms.push("Vendor must mention final price, GST/invoice status and payment terms.");
    commercialTerms.push("Vendor must clearly mention delivery, loading/unloading or site execution charges.");

    vendorExpectations.push("Quote should include final price and hidden charges, if any.");
    vendorExpectations.push("Vendor should confirm availability before accepting the RFQ.");
    vendorExpectations.push("Vendor should reply in chat with delivery/work timeline and payment terms.");

    const fallbackScope =
      title.trim() ||
      description.trim() ||
      aiRequirement.trim() ||
      `Procurement requirement for ${moduleLabel(module)}`;

    const structured: StructuredRfqBlock = {
      scope: fallbackScope,
      deliverables:
        deliverables.length > 0
          ? deliverables
          : ["Supply/service execution as per buyer requirement and vendor confirmation."],
      technicalRequirements:
        technicalRequirements.length > 0
          ? technicalRequirements
          : ["Vendor should confirm exact specification, quantity, unit and availability."],
      commercialTerms,
      vendorExpectations,
      timeline:
        procurementInsight.urgencyLevel === "Critical"
          ? "Critical timeline: same-day/next-day vendor coordination required."
          : procurementInsight.urgencyLevel === "Urgent"
            ? "Urgent timeline: complete vendor confirmation within 2–7 days."
            : "Normal timeline: complete quote comparison, negotiation and confirmation within 7–15 days.",
    };

    setStructuredRfq(structured);

    const reasoning: ProcurementReasoningItem[] = [
      {
        title: "Scope clarity",
        detail:
          description.trim().length >= 40
            ? "The RFQ has a usable description, so vendors can understand the requirement faster."
            : "The RFQ needs a stronger description so vendors can quote accurately.",
        tone: description.trim().length >= 40 ? "green" : "amber",
      },
      {
        title: "Vendor matching",
        detail:
          supplierRecommendationCards.length > 0
            ? `${supplierRecommendationCards.length} supplier match(es) are available for comparison.`
            : "Supplier matching will improve after item and location details are stronger.",
        tone: supplierRecommendationCards.length > 0 ? "blue" : "amber",
      },
      {
        title: "Delivery risk",
        detail: `AI delivery risk is ${procurementInsight.deliveryRisk}. ${procurementInsight.timelineEstimate}`,
        tone:
          procurementInsight.deliveryRisk === "Low"
            ? "green"
            : procurementInsight.deliveryRisk === "Medium"
              ? "amber"
              : "red",
      },
      {
        title: "Commercial readiness",
        detail:
          contactPhone.trim() || contactEmail.trim()
            ? "Buyer contact is available, so vendors can respond or coordinate after RFQ submission."
            : "Phone or email is missing. Public RFQ submission needs buyer contact.",
        tone: contactPhone.trim() || contactEmail.trim() ? "green" : "red",
      },
    ];

    setProcurementReasoning(reasoning);

    const recs: ProcurementRecommendationCard[] = [
      {
        title: "Convert into professional RFQ format",
        detail: "AI can add scope, deliverables, technical requirements, commercial terms and vendor expectations into the description.",
        actionText: "Apply structured RFQ",
        applyText: [
          `Scope: ${structured.scope}`,
          "",
          "Deliverables:",
          ...structured.deliverables.map((x) => `• ${x}`),
          "",
          "Technical Requirements:",
          ...structured.technicalRequirements.map((x) => `• ${x}`),
          "",
          "Commercial Terms:",
          ...structured.commercialTerms.map((x) => `• ${x}`),
          "",
          "Vendor Expectations:",
          ...structured.vendorExpectations.map((x) => `• ${x}`),
          "",
          `Timeline: ${structured.timeline}`,
        ].join("\n"),
      },
      {
        title: "Add negotiation-ready vendor instruction",
        detail: "This helps vendors reply with comparable price, delivery and payment information.",
        actionText: "Add vendor instruction",
        applyText:
          "Vendor instruction: Please quote final price, GST/invoice status, delivery or site charges, availability, payment terms and earliest delivery/work completion date.",
      },
      {
        title: "Add alternate procurement strategy",
        detail:
          procurementInsight.complexityLevel === "High"
            ? "AI recommends collecting multiple vendor quotes before final confirmation."
            : "AI recommends fast local vendor confirmation with clear price and timeline.",
        actionText: "Add strategy note",
        applyText:
          procurementInsight.complexityLevel === "High"
            ? "Procurement strategy: Please compare at least 3 vendor quotes based on price, delivery timeline, quality/brand, GST billing and payment terms before final selection."
            : "Procurement strategy: Prefer nearby vendors who can confirm availability, final price and delivery/work timeline quickly.",
      },
    ];

    setProcurementRecommendations(recs);
  }, [
    aiRequirement,
    title,
    description,
    items,
    city,
    locality,
    pincode,
    neededBy,
    module,
    procurementInsight,
    supplierRecommendationCards.length,
    contactPhone,
    contactEmail,
  ]);

  function applyTextToDescription(text: string) {
    setDescription((prev) => {
      const base = prev.trim();
      if (base.includes(text.trim())) return base;
      return base ? `${base}\n\n${text}` : text;
    });

    showPopup("AI procurement block added to description.", "success");
  }

    function startQuickVoiceInput() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showPopup("Voice input is not supported in this browser.", "error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "bn-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setVoiceListening(true);

    recognition.onresult = (event: any) => {
      const spoken = event?.results?.[0]?.[0]?.transcript || "";
      if (spoken) {
        setQuickNeed(spoken);
        setAiRequirement(spoken);
        showPopup("Voice requirement captured.", "success");
      }
    };

    recognition.onerror = () => {
      showPopup("Voice input failed. Please try again or type manually.", "error");
    };

    recognition.onend = () => setVoiceListening(false);

    recognition.start();
  }

    function applyQuickRfq() {
    const need = quickNeed.trim();
    const location = quickLocation.trim();
    const qty = quickQty.trim();

    if (!need) {
      showPopup("Please tell us what you need first.", "error");
      return;
    }

    const lower = need.toLowerCase();

    if (
      lower.includes("jcb") ||
      lower.includes("excavator") ||
      lower.includes("machine rent") ||
      lower.includes("rent")
    ) {
      setModule("rentals");
    } else if (
      lower.includes("mistri") ||
      lower.includes("mason") ||
      lower.includes("labour") ||
      lower.includes("electric") ||
      lower.includes("plumber") ||
      lower.includes("service")
    ) {
      setModule("services");
    } else if (
      lower.includes("land") ||
      lower.includes("plot") ||
      lower.includes("flat") ||
      lower.includes("house") ||
      lower.includes("property")
    ) {
      setModule("properties");
    } else {
      setModule("materials");
    }

    const titleText = qty ? `${need} - ${qty}` : need;

    setTitle(titleText.slice(0, 90));
    setAiRequirement([need, qty, location].filter(Boolean).join(" | "));
    setDescription(
      [
        `Requirement: ${need}`,
        qty ? `Approx quantity: ${qty}` : "",
        location ? `Preferred location: ${location}` : "",
        "Please quote price, availability, delivery/work timeline, GST/invoice terms and payment terms.",
      ]
        .filter(Boolean)
        .join("\n")
    );

    if (location) {
      setCity((prev) => prev || location);
      setLocality((prev) => prev || location);
    }

    if (qty) {
      setItems([
        {
          item_name: need,
          qty,
          unit: "",
          notes: location ? `Location: ${location}` : "",
        },
      ]);
    } else {
      setItems([
        {
          item_name: need,
          qty: "",
          unit: "",
          notes: location ? `Location: ${location}` : "",
        },
      ]);
    }

    setShowInlineModule(true);
    setAiAutoFillApplied(true);
    setAiAutoFillSummary("Quick RFQ mode prepared the draft requirement.");
    setShowProgressiveBuilder(true);

    showPopup("Quick RFQ draft prepared. Please review and submit.", "success");
  }

  const constructionBudgetEstimate = useMemo(
    () =>
      estimateConstructionCost({
        builtUpAreaSqFt: constructionAreaSqFt,
        floorCount: constructionFloorCount,
        grade: constructionGrade,
        region: city.toLowerCase().includes("cooch") ? "cooch_behar" : "default",
      }),
    [constructionAreaSqFt, constructionFloorCount, constructionGrade, city],
  );

  const browseLink = `${browseHref(module)}?returnTo=${encodeURIComponent("/rfq/general/new")}&module=${encodeURIComponent(module)}`;

  return (
    <div className="container pageBody" style={{ paddingTop: 16 }}>
      <WorkflowContinuityRecorder
        state={{
          id: "rfq-general-new",
          module: "rfq",
          stage: "draft",
          title: "Submit Requirement",
          summary: "Continue preparing your requirement, item details, location and contact information.",
          href: "/rfq/general/new",
          primaryActionLabel: "Continue Requirement",
          updatedAt: Date.now(),
        }}
      />
      <WorkflowContinuityBar />
      <OperationalEventRecorder
        event={{
          id: "rfq-draft-opened",
          module: "rfq",
          title: "Requirement draft opened",
          detail: "Continue preparing item details, location and contact information.",
          href: "/rfq/general/new",
          tone: "info",
          createdAt: Date.now(),
        }}
      />
      <OperationalEventStream title="Recent requirement activity" limit={5} />

      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Submit Requirement (Unified RFQ)</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        Select module → describe requirement → add items/work or upload a handwritten/PDF list.
      </div>

            <div
        style={{
          border: "1px solid rgba(37,99,235,0.16)",
          background: "#ffffff",
          borderRadius: 18,
          padding: 12,
          marginBottom: 16,
          boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
          position: "sticky",
          top: 10,
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Guided Requirement Submission
            </div>

            <div
              style={{
                marginTop: 4,
                color: "#64748b",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Complete your requirement step by step so suppliers can respond clearly.
            </div>
          </div>

          <div
            style={{
              background: "#dbeafe",
              color: "#1d4ed8",
              borderRadius: 12,
              padding: "8px 12px",
              fontWeight: 800,
              alignSelf: "center",
            }}
          >
            {smartProgress.percent}% completed
          </div>
        </div>

        <div
          style={{
            height: 10,
            background: "#e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: `${smartProgress.percent}%`,
              height: "100%",
              background: "#ffffff",
            }}
          />
        </div>

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 900, color: "#1d4ed8" }}>
            View Progress Stages
          </summary>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 8,
              marginTop: 10,
            }}
          >
            {RFQ_PROGRESS_STEPS.map((step, idx) => {
            const active = idx + 1 <= smartProgress.current;

            return (
              <div
                key={step}
                style={{
                  border: active
                    ? "1px solid #93c5fd"
                    : "1px solid #e5e7eb",
                  background: active ? "#eff6ff" : "#f8fafc",
                  color: active ? "#1d4ed8" : "#64748b",
                  borderRadius: 12,
                  padding: 10,
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 4 }}>
                  {active ? "✅" : "○"}
                </div>

                {step}
              </div>
            );
            })}
          </div>
        </details>
      </div>

      {aiAutoFillApplied ? (
        <div
          style={{
            border: "1px solid rgba(34,197,94,0.35)",
            background: "rgba(34,197,94,0.08)",
            color: "#166534",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            fontWeight: 800,
            lineHeight: 1.6,
          }}
        >
          Requirement details were prepared from your homepage search.
          {aiAutoFillSummary ? <div style={{ fontWeight: 700 }}>{aiAutoFillSummary}</div> : null}
        </div>
      ) : null}

      {rfqAi || rfqAiLoading || rfqAiError ? (
        <div
          style={{
            border: "1px solid rgba(124,58,237,0.28)",
            background: "#ffffff",
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
            boxShadow: "0 10px 24px rgba(124,58,237,0.06)",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setShowAiRfqAssistant((prev) => !prev)
            }
            style={{
              width: "100%",
              border: 0,
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
              padding: 0,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: "#6d28d9",
                  fontSize: 18,
                }}
              >
                Need Help Improving This Requirement?
              </div>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#6d28d9",
                }}
              >
                {showAiRfqAssistant ? "−" : "+"}
              </div>
            </div>
          </button>

          {showAiRfqAssistant ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800, color: "#6d28d9" }}>
                Need Help Improving This Requirement?
              </div>
              <div style={{ marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 700 }}>
                Check what is missing before submitting.
              </div>
            </div>

            <div
              style={{
                fontWeight: 800,
                color: "#fff",
                background: rfqHealthTone,
                borderRadius: 12,
                padding: "7px 12px",
                alignSelf: "center",
              }}
            >
              {rfqAiLoading ? "Checking..." : `Clarity ${rfqAi?.rfqHealthScore ?? "—"}/100`}
            </div>
          </div>

          {rfqAiError ? (
            <div style={{ marginTop: 10, color: "#991b1b", fontWeight: 900 }}>
              {rfqAiError}
            </div>
          ) : null}

          {rfqAi ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    border: "1px solid #ddd6fe",
                    background: "#f5f3ff",
                    color: "#5b21b6",
                    borderRadius: 12,
                    padding: "5px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  Expected replies: {rfqAi.expectedVendorReplies || "—"}
                </span>

                <span
                  style={{
                    border: "1px solid #bbf7d0",
                    background: "#ecfdf5",
                    color: "#065f46",
                    borderRadius: 12,
                    padding: "5px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  Closure chance: {rfqAi.expectedClosureProbability ?? "—"}%
                </span>

                <span
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "#f8fafc",
                    color: "#334155",
                    borderRadius: 12,
                    padding: "5px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  Checked by: {rfqAi.source || "Assistant"}
                </span>
              </div>

              <div style={{ color: "#334155", fontSize: 13, fontWeight: 800 }}>
                {rfqAi.aiSummary}
              </div>

              {Array.isArray(rfqAi.missingInformation) && rfqAi.missingInformation.length > 0 ? (
                <div
                  style={{
                    border: "1px solid #fed7aa",
                    background: "#fff7ed",
                    color: "#9a3412",
                    borderRadius: 12,
                    padding: 10,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>⚠ Missing / weak details</div>
                  {rfqAi.missingInformation.slice(0, 4).map((x, idx) => (
                    <div key={idx}>• {x}</div>
                  ))}
                </div>
              ) : null}

              {Array.isArray(rfqAi.improvementSuggestions) && rfqAi.improvementSuggestions.length > 0 ? (
                <div
                  style={{
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    color: "#1e3a8a",
                    borderRadius: 12,
                    padding: 10,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Suggested improvements</div>
                  {rfqAi.improvementSuggestions.slice(0, 4).map((x, idx) => (
                    <div key={idx}>• {x}</div>
                  ))}
                </div>
              ) : null}

              <div style={{ color: "#111827", fontSize: 13, fontWeight: 900 }}>
                Suggested next step: {rfqAi.recommendedAction}
              </div>
            </div>
          ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {supplierRecommendationCards.length > 0 ? (
        <div
          style={{
            border: "1px solid rgba(37,99,235,0.30)",
            background: "#ffffff",
            borderRadius: 18,
            padding: 12,
            marginBottom: 14,
            boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: showSupplierIntel ? 12 : 0,
            }}
          >
            <button
              type="button"
              onClick={() => setShowSupplierIntel((prev) => !prev)}
              style={{
                border: 0,
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 800, color: "#1e3a8a", fontSize: 18 }}>
                Supplier Match Guidance
                <span style={{ marginLeft: 10, color: "#2563eb" }}>
                  {showSupplierIntel ? "−" : "+"}
                </span>
              </div>

              <div style={{ color: "#475569", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                See possible nearby suppliers based on location, requirement clarity and match quality.
              </div>
            </button>

            {bestSupplier ? (
              <div
                style={{
                  background: "#dbeafe",
                  color: "#1e40af",
                  border: "1px solid #bfdbfe",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontWeight: 800,
                  alignSelf: "center",
                }}
              >
                Best match: {bestSupplier.name}
              </div>
            ) : null}
          </div>

          {showSupplierIntel ? (
            <>
              <div style={{ display: "grid", gap: 10 }}>
                {supplierRecommendationCards.map((v) => (
                  <div
                    key={`${v.name}-${v.rank}`}
                    style={{
                      background: "#ffffff",
                      border: v.rank === 1 ? "2px solid #2563eb" : "1px solid rgba(15,23,42,0.10)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span
                            style={{
                              background: v.rank === 1 ? "#2563eb" : "#e2e8f0",
                              color: v.rank === 1 ? "#ffffff" : "#334155",
                              borderRadius: 12,
                              padding: "4px 9px",
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            Rank #{v.rank}
                          </span>

                          <div style={{ fontWeight: 800, color: "#0f172a" }}>{v.name}</div>
                        </div>

                        <div style={{ color: "#475569", fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                          {v.reason}
                        </div>

                        {[v.locality, v.city, v.district, v.pincode].filter(Boolean).length > 0 ? (
                          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4, fontWeight: 700 }}>
                            📍 {[v.locality, v.city, v.district, v.pincode].filter(Boolean).join(", ")}
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          fontWeight: 800,
                          color: "#166534",
                          background: "#dcfce7",
                          borderRadius: 12,
                          padding: "7px 11px",
                          alignSelf: "center",
                        }}
                      >
                        {v.score}% match
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Delivery confidence</div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{v.deliveryConfidence}</div>
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Pricing confidence</div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{v.pricingConfidence}</div>
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>Negotiation</div>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>{v.negotiationReadiness}</div>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        border: "1px solid #bbf7d0",
                        background: "#f0fdf4",
                        color: "#14532d",
                        borderRadius: 10,
                        padding: 9,
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      <b>{v.aiStrength}:</b> {v.shortlistReason}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 12,
                  border: "1px solid #fde68a",
                  background: "#fffbeb",
                  color: "#78350f",
                  borderRadius: 12,
                  padding: 10,
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                📊 Supplier comparison: Submit this requirement to compare quote price, delivery timeline, chat readiness and deal progress.
              </div>
            </>
          ) : null}
        </div>
      ) : null}

            <div style={{ height: 22 }} />

            <div
        style={{
          border: "1px solid rgba(37,99,235,0.18)",
          background: "#ffffff",
          borderRadius: 18,
          padding: 12,
          marginBottom: 16,
          boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a8a" }}>
              Quick Requirement Mode
            </div>
            <div style={{ marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 700 }}>
              Type naturally like WhatsApp. The form will be prepared for you.
            </div>
          </div>

          <div
            style={{
              background: "#dbeafe",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              borderRadius: 12,
              padding: "8px 12px",
              fontWeight: 800,
              alignSelf: "center",
              fontSize: 12,
            }}
          >
            Beginner friendly
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              typeof window !== "undefined" && window.innerWidth < 768
                ? "1fr"
                : "1.5fr 1fr 1fr auto",
            gap: 10,
            marginTop: 14,
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 5 }}>
              What do you need?
            </label>
            <input
              value={quickNeed}
              onChange={(e) => setQuickNeed(e.target.value)}
              placeholder="Example: 500 bags cement / electrician / JCB rent"
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 5 }}>
              Location
            </label>
            <input
              value={quickLocation}
              onChange={(e) => setQuickLocation(e.target.value)}
              placeholder="Cooch Behar / Khagrabari"
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 700,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 900, marginBottom: 5 }}>
              Approx quantity
            </label>
            <input
              value={quickQty}
              onChange={(e) => setQuickQty(e.target.value)}
              placeholder="500 bags / 2 days"
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 700,
              }}
            />
          </div>

          <button
            type="button"
            onClick={startQuickVoiceInput}
            style={{
              border: "1px solid #bfdbfe",
              borderRadius: 12,
              background: voiceListening ? "#dbeafe" : "#ffffff",
              color: "#1d4ed8",
              padding: "11px 14px",
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {voiceListening ? "Listening..." : "🎙 Voice"}
          </button>

          <button
            type="button"
            onClick={applyQuickRfq}
            style={{
              border: 0,
              borderRadius: 12,
              background: "#2563eb",
              color: "#ffffff",
              padding: "11px 14px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 10px 22px rgba(37,99,235,0.22)",
              whiteSpace: "nowrap",
            }}
          >
            Prepare RFQ
          </button>
        </div>

        <div style={{ marginTop: 10, color: "#64748b", fontSize: 12, fontWeight: 700 }}>
          Examples: “Need 500 bags cement in Cooch Behar”, “JCB rent for 2 days”, “Electrician for house wiring”.
        </div>
      </div>

      <div
        style={{
          border: "1px solid rgba(79,70,229,0.28)",
          background: "#ffffff",
          borderRadius: 18,
          padding: 12,
          marginBottom: 14,
          boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#3730a3" }}>
              <button
                type="button"
                onClick={() =>
                  setShowProcurementReadiness((prev) => !prev)
                }
                style={{
                  width: "100%",
                  border: 0,
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    📈 Requirement Progress Tracker
                  </div>

                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#2563eb",
                    }}
                  >
                    {showProcurementReadiness ? "−" : "+"}
                  </div>
                </div>
              </button>
            </div>

            <div style={{ color: "#475569", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
              Shows what is complete, what is missing, and what should be added next.
            </div>
          </div>

          <div
            style={{
              background:
                procurementInsight.readinessScore >= 75
                  ? "#dcfce7"
                  : procurementInsight.readinessScore >= 50
                    ? "#fef3c7"
                    : "#fee2e2",
              color:
                procurementInsight.readinessScore >= 75
                  ? "#166534"
                  : procurementInsight.readinessScore >= 50
                    ? "#92400e"
                    : "#991b1b",
              borderRadius: 12,
              padding: "8px 13px",
              fontWeight: 800,
              alignSelf: "center",
            }}
          >
            Progress {procurementInsight.readinessScore}/100
          </div>
        </div>

        <div style={{ marginTop: 12, background: "#e5e7eb", height: 10, borderRadius: 12, overflow: "hidden" }}>
          <div
            style={{
              width: `${procurementInsight.completionPercent}%`,
              height: "100%",
              background:
                procurementInsight.completionPercent >= 75
                  ? "#16a34a"
                  : procurementInsight.completionPercent >= 50
                    ? "#d97706"
                    : "#dc2626",
            }}
          />
        </div>

        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
          RFQ completion: {procurementInsight.completionPercent}%
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
          {[
            ["Complexity", procurementInsight.complexityLevel],
            ["Urgency", procurementInsight.urgencyLevel],
            ["Delivery risk", procurementInsight.deliveryRisk],
            ["Vendor response", procurementInsight.expectedVendorResponse],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>{label}</div>
              <div style={{ color: "#0f172a", fontWeight: 800, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns:
          typeof window !== "undefined" && window.innerWidth < 768
            ? "1fr"
            : "1fr 1fr", gap: 10, marginTop: 12 }}>
          <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", borderRadius: 12, padding: 10, fontSize: 13, fontWeight: 800 }}>
            ⏱ Timeline estimate: {procurementInsight.timelineEstimate}
          </div>

          <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#14532d", borderRadius: 12, padding: 10, fontSize: 13, fontWeight: 800 }}>
            ✅ Next milestone: {procurementInsight.nextMilestone}
          </div>
        </div>

        {procurementInsight.missingFields.length > 0 ? (
          <div style={{ marginTop: 12, border: "1px solid #fed7aa", background: "#fff7ed", color: "#9a3412", borderRadius: 12, padding: 10, fontSize: 13, fontWeight: 800 }}>
            <div style={{ fontWeight: 800, marginBottom: 5 }}>Missing details to complete</div>
            {procurementInsight.missingFields.slice(0, 5).map((x, idx) => (
              <div key={idx}>• {x}</div>
            ))}
          </div>
        ) : null}
      </div>

            {(structuredRfq || procurementReasoning.length > 0 || procurementRecommendations.length > 0) ? (
        <div
          style={{
            border: "1px solid rgba(124,58,237,0.28)",
            background: "#ffffff",
            borderRadius: 18,
            padding: 12,
            marginBottom: 14,
            boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#5b21b6" }}>
                🧩 Convert Into Clear Requirement Format
              </div>
              <div style={{ color: "#475569", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                Turn your rough notes into clear scope, deliverables, terms and vendor expectations.
              </div>
            </div>

            <div
              style={{
                background: "#ede9fe",
                color: "#5b21b6",
                border: "1px solid #ddd6fe",
                borderRadius: 12,
                padding: "8px 12px",
                fontWeight: 800,
                alignSelf: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setShowStructuredRfq((prev) => !prev)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#5b21b6",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {showStructuredRfq ? "Hide Details −" : "Show Details +"}
              </button>
            </div>
          </div>

          {showStructuredRfq && structuredRfq ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  border: "1px solid #ddd6fe",
                  background: "#faf5ff",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <div style={{ fontWeight: 800, color: "#581c87", marginBottom: 5 }}>
                  Scope
                </div>
                <div style={{ color: "#334155", fontSize: 13, fontWeight: 800 }}>
                  {structuredRfq.scope}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns:
                typeof window !== "undefined" && window.innerWidth < 768
                  ? "1fr"
                  : "1fr 1fr", gap: 10 }}>
                <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 800, color: "#1e3a8a", marginBottom: 5 }}>
                    Deliverables
                  </div>
                  {structuredRfq.deliverables.slice(0, 4).map((x, idx) => (
                    <div key={idx} style={{ fontSize: 13, color: "#1e40af", fontWeight: 800 }}>
                      • {x}
                    </div>
                  ))}
                </div>

                <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 800, color: "#166534", marginBottom: 5 }}>
                    Technical Requirements
                  </div>
                  {structuredRfq.technicalRequirements.slice(0, 4).map((x, idx) => (
                    <div key={idx} style={{ fontSize: 13, color: "#14532d", fontWeight: 800 }}>
                      • {x}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns:
                typeof window !== "undefined" && window.innerWidth < 768
                  ? "1fr"
                  : "1fr 1fr", gap: 10 }}>
                <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 800, color: "#92400e", marginBottom: 5 }}>
                    Commercial Terms
                  </div>
                  {structuredRfq.commercialTerms.slice(0, 4).map((x, idx) => (
                    <div key={idx} style={{ fontSize: 13, color: "#78350f", fontWeight: 800 }}>
                      • {x}
                    </div>
                  ))}
                </div>

                <div style={{ border: "1px solid #c7d2fe", background: "#eef2ff", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 800, color: "#3730a3", marginBottom: 5 }}>
                    Vendor Expectations
                  </div>
                  {structuredRfq.vendorExpectations.slice(0, 4).map((x, idx) => (
                    <div key={idx} style={{ fontSize: 13, color: "#312e81", fontWeight: 800 }}>
                      • {x}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e9d5ff",
                  background: "#faf5ff",
                  borderRadius: 12,
                  padding: 10,
                  color: "#581c87",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                Timeline: {structuredRfq.timeline}
              </div>
            </div>
          ) : null}

          {showStructuredRfq && procurementReasoning.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                🧠 Requirement Insights
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                {procurementReasoning.map((r, idx) => {
                  const bg =
                    r.tone === "green"
                      ? "#f0fdf4"
                      : r.tone === "amber"
                        ? "#fffbeb"
                        : r.tone === "red"
                          ? "#fef2f2"
                          : r.tone === "purple"
                            ? "#faf5ff"
                            : "#eff6ff";

                  const color =
                    r.tone === "green"
                      ? "#166534"
                      : r.tone === "amber"
                        ? "#92400e"
                        : r.tone === "red"
                          ? "#991b1b"
                          : r.tone === "purple"
                            ? "#5b21b6"
                            : "#1e3a8a";

                  return (
                    <div key={`${r.title}-${idx}`} style={{ border: "1px solid rgba(15,23,42,0.10)", background: bg, borderRadius: 12, padding: 10 }}>
                      <div style={{ color, fontWeight: 800, marginBottom: 4 }}>
                        {r.title}
                      </div>
                      <div style={{ color: "#334155", fontSize: 13, fontWeight: 800 }}>
                        {r.detail}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {showStructuredRfq && procurementRecommendations.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                🎯 Suggested Improvements
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {procurementRecommendations.map((r, idx) => (
                  <div
                    key={`${r.title}-${idx}`}
                    style={{
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "#ffffff",
                      borderRadius: 12,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ maxWidth: 760 }}>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>
                        {r.title}
                      </div>
                      <div style={{ color: "#475569", fontSize: 13, fontWeight: 800, marginTop: 4 }}>
                        {r.detail}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="topBtn topBtnPrimary"
                      onClick={() => applyTextToDescription(r.applyText)}
                    >
                      {r.actionText}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

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

            <div
        style={{
          border: "1px solid #dbeafe",
          background: "#eff6ff",
          borderRadius: 18,
          padding: 14,
          marginBottom: 22,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
          Need Help Writing?
        </div>

        <div style={{ fontSize: 14, color: "#334155", marginBottom: 14 }}>
          Describe your requirement naturally and get help preparing the RFQ.
          {autocompleteLoading ? (
            <span style={{ marginLeft: 8, color: "#2563eb", fontWeight: 900 }}>
              Checking...
            </span>
          ) : null}
        </div>

        <textarea
          value={aiRequirement}
          onChange={(e) => setAiRequirement(e.target.value)}
          placeholder="Example: Need 500 bags cement for house construction in Cooch Behar with delivery within 7 days"
          rows={4}
          style={{
            width: "100%",
            border: "1px solid #bfdbfe",
            borderRadius: 12,
            padding: 12,
            fontSize: 15,
            resize: "vertical",
            background: "white",
          }}
        />

        <button
          type="button"
          onClick={generateAiRfqDraft}
          disabled={aiDrafting}
          style={{
            marginTop: 14,
            border: 0,
            borderRadius: 12,
            background: aiDrafting ? "#93c5fd" : "#2563eb",
            color: "white",
            padding: "10px 14px",
            fontWeight: 900,
            cursor: aiDrafting ? "not-allowed" : "pointer",
          }}
        >
          {aiDrafting ? "Preparing RFQ..." : "Prepare Requirement Draft"}
        </button>
      </div>

      <ProcurementCopilotBox
        defaultMessage={aiRequirement}
        module={module}
        city={city}
        district=""
        locality={locality}
      />

      <div
        style={{
          border: "1px solid rgba(22,163,74,0.28)",
          background: "#ffffff",
          borderRadius: 18,
          padding: 12,
          marginTop: 14,
          marginBottom: 18,
        }}
      >
        <button
          type="button"
          onClick={() => setShowConstructionBudget((prev) => !prev)}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#166534" }}>
                🏗 Budget Estimate
              </div>
              <div style={{ color: "#475569", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                Estimate possible house construction cost before submitting the requirement.
              </div>
            </div>

            <div style={{ fontSize: 18, fontWeight: 800, color: "#166534" }}>
              {showConstructionBudget ? "−" : "+"}
            </div>
          </div>
        </button>

        {showConstructionBudget ? (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <label>
                <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 5 }}>
                  Built-up area sq.ft
                </div>
                <input
                  type="number"
                  value={constructionAreaSqFt}
                  onChange={(e) => setConstructionAreaSqFt(Number(e.target.value || 1000))}
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 700,
                  }}
                />
              </label>

              <label>
                <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 5 }}>
                  Floors
                </div>
                <select
                  value={constructionFloorCount}
                  onChange={(e) => setConstructionFloorCount(Number(e.target.value))}
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 700,
                  }}
                >
                  {[1, 2, 3, 4, 5].map((floor) => (
                    <option key={floor} value={floor}>
                      {floor} Floor{floor > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 5 }}>
                  Grade
                </div>
                <select
                  value={constructionGrade}
                  onChange={(e) => setConstructionGrade(e.target.value as ConstructionGrade)}
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 700,
                  }}
                >
                  <option value="economy">Economy</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                gap: 10,
                marginTop: 12,
              }}
            >
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#166534", fontWeight: 900 }}>
                  Estimated Budget
                </div>
                <div style={{ marginTop: 4, color: "#14532d", fontSize: 18, fontWeight: 800 }}>
                  {formatIndianCurrency(constructionBudgetEstimate.estimatedTotal)}
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                  Rate Per Sq.ft
                </div>
                <div style={{ marginTop: 4, color: "#0f172a", fontSize: 18, fontWeight: 800 }}>
                  {formatIndianCurrency(constructionBudgetEstimate.ratePerSqFt)}
                </div>
              </div>

              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#92400e", fontWeight: 900 }}>
                  Expected Range
                </div>
                <div style={{ marginTop: 4, color: "#78350f", fontSize: 14, fontWeight: 800 }}>
                  {formatIndianCurrency(constructionBudgetEstimate.estimatedMinTotal)} -{" "}
                  {formatIndianCurrency(constructionBudgetEstimate.estimatedMaxTotal)}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="topBtn topBtnPrimary"
              style={{ marginTop: 12 }}
              onClick={() => {
                const block = [
                  "Construction Budget Estimate:",
                  `Built-up area: ${constructionAreaSqFt} sq.ft`,
                  `Floors: ${constructionFloorCount}`,
                  `Grade: ${constructionGrade}`,
                  `Estimated budget: ${formatIndianCurrency(constructionBudgetEstimate.estimatedTotal)}`,
                  `Estimated rate: ${formatIndianCurrency(constructionBudgetEstimate.ratePerSqFt)} per sq.ft`,
                  `Expected range: ${formatIndianCurrency(constructionBudgetEstimate.estimatedMinTotal)} - ${formatIndianCurrency(constructionBudgetEstimate.estimatedMaxTotal)}`,
                ].join("\n");

                setDescription((prev) => (prev.trim() ? `${prev}\n\n${block}` : block));
                setModule("services");
                showPopup("Construction budget estimate added to RFQ description.", "success");
              }}
            >
              Add Estimate to RFQ
            </button>
          </div>
        ) : null}
      </div>

      <div
        style={{
          border: "1px solid rgba(14,165,233,0.28)",
          background: "#ffffff",
          borderRadius: 18,
          padding: 12,
          marginTop: 14,
          marginBottom: 18,
        }}
      >
        <button
          type="button"
          onClick={() => setShowProgressiveBuilder((prev) => !prev)}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#075985", marginBottom: 6 }}>
              🧠 Step-by-Step Requirement Builder
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#075985" }}>
              {showProgressiveBuilder ? "−" : "+"}
            </div>
          </div>
        </button>

        <div style={{ color: "#475569", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
          Helpful suggestions, previous requirements, vendor discussion points and rough budget guidance.
        </div>

        {showProgressiveBuilder ? (
          liveSuggestions.length > 0 ? (
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              {liveSuggestions.map((s, idx) => (
                <div
                  key={`${s.label}-${idx}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    border: "1px solid rgba(2,132,199,0.18)",
                    background: "#f0f9ff",
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{s.value}</div>
                  </div>

                  <button
                    type="button"
                    className="topBtn topBtnGhost"
                    onClick={() => applyLiveSuggestion(s)}
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>
              Start typing your requirement to get helpful suggestions.
            </div>
          )
        ) : null}

        {showProgressiveBuilder ? (
        <div style={{ display: "grid", gridTemplateColumns:
          typeof window !== "undefined" && window.innerWidth < 768
            ? "1fr"
            : "1fr 1fr", gap: 10 }}>
          <div
            style={{
              border: "1px solid rgba(22,163,74,0.22)",
              background: "#f0fdf4",
              borderRadius: 12,
              padding: 10,
            }}
          >
            <div style={{ fontWeight: 800, color: "#166534", marginBottom: 4 }}>
              💰 Budget Guidance
            </div>
            <div style={{ fontSize: 13, color: "#14532d", fontWeight: 700 }}>
              {estimatedBudget || "Add item and quantity to get rough procurement budget guidance."}
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(217,119,6,0.22)",
              background: "#fffbeb",
              borderRadius: 12,
              padding: 10,
            }}
          >
            <div style={{ fontWeight: 800, color: "#92400e", marginBottom: 4 }}>
              🤝 Vendor Discussion Guidance
            </div>
            <div style={{ fontSize: 13, color: "#78350f", fontWeight: 700 }}>
              {negotiationCoach || "After vendor replies, compare price, timeline and payment terms before closing."}
            </div>
          </div>
        </div>
        ) : null}

        {showProgressiveBuilder ? (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="topBtn topBtnPrimary" onClick={saveProcurementMemory}>
            Save Requirement
          </button>
        </div>
        ) : null}

        {showProgressiveBuilder && procurementMemory.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              Previous Requirements
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {procurementMemory.slice(0, 3).map((row) => (
                <div
                  key={row.id}
                  style={{
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "#ffffff",
                    borderRadius: 12,
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>{row.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                      {moduleLabel(row.module)}
                      {[row.locality, row.city, row.pincode].filter(Boolean).length > 0
                        ? ` • ${[row.locality, row.city, row.pincode].filter(Boolean).join(", ")}`
                        : ""}
                    </div>
                  </div>

                  <button type="button" className="topBtn topBtnGhost" onClick={() => applyMemoryToRfq(row)}>
                    Reuse
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

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
          {aiAutocomplete ? (
            <div
              style={{
                marginBottom: 10,
                border: "1px solid rgba(14,165,233,0.22)",
                background: "#f0f9ff",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#075985",
                    }}
                  >
                    ✨ Suggested Detail
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {aiAutocomplete.completion}
                  </div>
                </div>

                <button
                  type="button"
                  className="topBtn topBtnGhost"
                  onClick={() => {
                    setDescription((prev) => {
                      if (
                        prev.includes(aiAutocomplete.completion)
                      ) {
                        return prev;
                      }

                      return prev.trim()
                        ? `${prev}\n${aiAutocomplete.completion}`
                        : aiAutocomplete.completion;
                    });
                  }}
                >
                  Apply
                </button>
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#0369a1",
                  fontWeight: 900,
                }}
              >
                Suggestion strength: {aiAutocomplete.confidence}%
              </div>
            </div>
          ) : null}
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
          {scopeInsight ? (
            <div
              style={{
                marginTop: 14,
                border: "1px solid rgba(79,70,229,0.18)",
                background: "#f5f3ff",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: "#5b21b6",
                  marginBottom: 10,
                }}
              >
                🧠 Requirement Detail Check
              </div>

              {scopeInsight.technicalKeywords.length > 0 ? (
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#64748b",
                      marginBottom: 5,
                    }}
                  >
                    Technical keywords
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {scopeInsight.technicalKeywords.map((k) => (
                      <span
                        key={k}
                        style={{
                          background: "#ede9fe",
                          color: "#5b21b6",
                          borderRadius: 12,
                          padding: "5px 10px",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {scopeInsight.commercialTerms.length > 0 ? (
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#64748b",
                      marginBottom: 5,
                    }}
                  >
                    Commercial terms
                  </div>

                  {scopeInsight.commercialTerms.map((k) => (
                    <div
                      key={k}
                      style={{
                        color: "#334155",
                        fontSize: 13,
                        fontWeight: 700,
                        marginBottom: 3,
                      }}
                    >
                      • {k}
                    </div>
                  ))}
                </div>
              ) : null}

              {scopeInsight.riskFlags.length > 0 ? (
                <div
                  style={{
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#991b1b",
                      marginBottom: 5,
                    }}
                  >
                    ⚠ Details needing attention
                  </div>

                  {scopeInsight.riskFlags.map((k) => (
                    <div
                      key={k}
                      style={{
                        color: "#7f1d1d",
                        fontSize: 13,
                        fontWeight: 700,
                        marginBottom: 3,
                      }}
                    >
                      • {k}
                    </div>
                  ))}
                </div>
              ) : null}

              <div
                style={{
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  borderRadius: 10,
                  padding: 10,
                  color: "#1e3a8a",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                📊 {scopeInsight.procurementStrategy}
              </div>
            </div>
          ) : null}
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

          <div style={{ display: "grid", gridTemplateColumns:
            typeof window !== "undefined" && window.innerWidth < 768
              ? "1fr"
              : "1fr 1fr", gap: 12 }}>
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
                  gridTemplateColumns:
                    typeof window !== "undefined" && window.innerWidth < 768
                      ? "1fr"
                      : "2fr 1fr 1fr 2fr auto",
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
        <UniversalMediaUploader
          module="rfq"
          value={mediaAssets}
          onChange={setMediaAssets}
          label="Upload photos, videos or PDF list"
          helperText="Take a photo of handwritten lists, upload site photos, record short videos, or attach a PDF requirement."
          allowImages
          allowVideos
          allowDocuments
          maxFiles={10}
        />

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

        <div
          style={{
            position:
              typeof window !== "undefined" && window.innerWidth < 768
                ? "fixed"
                : "relative",
            left: 0,
            right: 0,
            bottom:
              typeof window !== "undefined" && window.innerWidth < 768
                ? 0
                : "auto",
            zIndex: 50,
            background:
              typeof window !== "undefined" && window.innerWidth < 768
                ? "#ffffff"
                : "transparent",
            borderTop:
              typeof window !== "undefined" && window.innerWidth < 768
                ? "1px solid #e2e8f0"
                : "none",
            padding:
              typeof window !== "undefined" && window.innerWidth < 768
                ? "12px"
                : "0px",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            boxShadow:
              typeof window !== "undefined" && window.innerWidth < 768
                ? "0 -10px 30px rgba(15,23,42,0.08)"
                : "none",
          }}
        >
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
      <div
        style={{
          height:
            typeof window !== "undefined" && window.innerWidth < 768
              ? 90
              : 0,
        }}
      />

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