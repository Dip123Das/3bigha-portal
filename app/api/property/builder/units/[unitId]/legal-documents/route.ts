import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
const BUCKET = "property-documents-private";
const MAX_BYTES = 8 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCUMENT_TYPES = new Set([
  "title_deed", "mutation", "land_revenue_tax", "panchayat_tax", "municipality_tax",
  "khatian_ror", "conversion", "sanctioned_plan", "possession", "other",
]);
const MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const clean = (value: unknown) => String(value ?? "").trim();
const fail = (message: string, status: number, code: string) =>
  NextResponse.json({ ok: false, error: { code, message } }, { status });

type Facts = {
  plotNumbers: string[];
  deedNumbers: string[];
  mutationNumbers: string[];
  khatianNumbers: string[];
};

function list(value: unknown): string[] {
  const source = Array.isArray(value) ? value : clean(value).split(/[,;\n]+/);
  return [...new Set(source.map(clean).filter(Boolean))].slice(0, 100);
}

function facts(value: any): Facts {
  return {
    plotNumbers: list(value?.plotNumbers ?? value?.plot_numbers),
    deedNumbers: list(value?.deedNumbers ?? value?.deed_numbers),
    mutationNumbers: list(value?.mutationNumbers ?? value?.mutation_numbers),
    khatianNumbers: list(value?.khatianNumbers ?? value?.khatian_numbers),
  };
}

function mergeFacts(...values: any[]): Facts {
  const parsed = values.map(facts);
  return {
    plotNumbers: list(parsed.flatMap((item) => item.plotNumbers)),
    deedNumbers: list(parsed.flatMap((item) => item.deedNumbers)),
    mutationNumbers: list(parsed.flatMap((item) => item.mutationNumbers)),
    khatianNumbers: list(parsed.flatMap((item) => item.khatianNumbers)),
  };
}

function normalized(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const RELEVANT_FIELDS: Record<string, (keyof Facts)[]> = {
  title_deed: ["deedNumbers", "plotNumbers"],
  mutation: ["mutationNumbers", "plotNumbers"],
  khatian_ror: ["khatianNumbers", "plotNumbers"],
  land_revenue_tax: ["plotNumbers", "khatianNumbers"],
  panchayat_tax: ["plotNumbers", "khatianNumbers"],
  municipality_tax: ["plotNumbers", "khatianNumbers"],
  conversion: ["plotNumbers", "khatianNumbers"],
  sanctioned_plan: ["plotNumbers"],
  possession: ["plotNumbers", "deedNumbers"],
  other: ["plotNumbers", "deedNumbers", "mutationNumbers", "khatianNumbers"],
};

function evaluateCoverage(profileValue: any, document: any) {
  const profile = facts(profileValue);
  const coverage = mergeFacts(document?.declared_facts, document?.extracted_facts);
  const fields = RELEVANT_FIELDS[clean(document?.document_type)] ?? RELEVANT_FIELDS.other;
  const requested = fields.flatMap((field) => profile[field].map((value) => ({ field, value })));
  const missing = requested.filter(({ field, value }) =>
    !new Set(coverage[field].map(normalized)).has(normalized(value)),
  );
  const matched = requested.filter(({ field, value }) =>
    new Set(coverage[field].map(normalized)).has(normalized(value)),
  );
  const status = requested.length > 0 && missing.length === 0 ? "reusable" : matched.length > 0 ? "partial" : "none";
  return {
    status,
    matched: matched.map((item) => item.value),
    missing: missing.map((item) => item.value),
    reason: status === "reusable"
      ? "The paper covers the relevant declared identifiers for this unit. Confirm before linking."
      : status === "partial"
        ? `Some identifiers match, but additional coverage is required for: ${missing.map((item) => item.value).join(", ")}.`
        : "No legally relevant identifier match was found.",
  };
}

function outputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  return (Array.isArray(payload?.output) ? payload.output : []).flatMap((item: any) =>
    (Array.isArray(item?.content) ? item.content : []).map((part: any) => clean(part?.text)),
  ).filter(Boolean).join("\n");
}

function parseJson(value: string) {
  try { return JSON.parse(value); } catch {}
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function analyseDocument(signedUrl: string, mimeType: string, declared: Facts) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { status: "unavailable", confidence: null, model: null, extracted: {}, summary: "AI analysis is unavailable; declared identifiers remain available for manual review.", warnings: ["OPENAI_API_KEY is not configured."] };
  const model = process.env.OPENAI_PROPERTY_DOCUMENT_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  try {
    const media = mimeType === "application/pdf"
      ? { type: "input_file", file_url: signedUrl }
      : { type: "input_image", image_url: signedUrl, detail: "high" };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model, temperature: 0,
        input: [{ role: "system", content: [{ type: "input_text", text:
          "Read this private Indian property paper and extract only visible facts. Never decide ownership, title validity, encumbrance, authenticity, approval, or legal sufficiency. Return strict JSON: {documentType, plotNumbers:string[], deedNumbers:string[], mutationNumbers:string[], khatianNumbers:string[], propertyAddress:string, ownerNames:string[], issuingAuthority:string, confidence:number, readable:boolean, warnings:string[], summary:string}. Preserve identifiers exactly as printed. Use empty arrays when absent." }] },
          { role: "user", content: [{ type: "input_text", text: `Extract identifiers for reuse comparison. Builder-declared hints (not authoritative): ${JSON.stringify(declared)}` }, media] }],
      }),
    });
    if (!response.ok) throw new Error(`AI analysis returned HTTP ${response.status}.`);
    const parsed = parseJson(outputText(await response.json()));
    if (!parsed) throw new Error("AI response was not valid JSON.");
    const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
    return {
      status: "completed", confidence, model,
      extracted: { ...facts(parsed), propertyAddress: clean(parsed.propertyAddress), ownerNames: list(parsed.ownerNames), issuingAuthority: clean(parsed.issuingAuthority), readable: Boolean(parsed.readable) },
      summary: clean(parsed.summary) || "AI extracted visible identifiers for builder review.",
      warnings: list(parsed.warnings),
    };
  } catch (error: any) {
    return { status: "failed", confidence: null, model, extracted: {}, summary: "The document was stored privately, but AI extraction did not complete.", warnings: [clean(error?.message) || "AI analysis failed."] };
  }
}

async function ownerContext(unitId: string) {
  const session = getSupabaseServerClient(await cookies());
  const { data: { user }, error } = await session.auth.getUser();
  if (error || !user?.id) return { response: fail("Authentication required.", 401, "UNAUTHORIZED") };
  if (!UUID.test(unitId)) return { response: fail("Invalid unit ID.", 400, "UNIT_ID_INVALID") };
  const admin = getSupabaseAdmin();
  const unit = await admin.from("builder_inventory_units").select("id,project_id,unit_code,title").eq("id", unitId).maybeSingle();
  if (unit.error || !unit.data) return { response: fail("Unit not found.", 404, "UNIT_NOT_FOUND") };
  const project = await admin.from("builder_projects").select("id,name,builder_profiles!inner(owner_user_id)")
    .eq("id", unit.data.project_id).eq("builder_profiles.owner_user_id", user.id).maybeSingle();
  if (project.error || !project.data) return { response: fail("Unit not found or you do not own it.", 403, "UNIT_FORBIDDEN") };
  return { admin, user, unit: unit.data, project: project.data };
}

export async function GET(_request: NextRequest, context: { params: { unitId: string } }) {
  const owned = await ownerContext(clean(context.params.unitId));
  if (owned.response) return owned.response;
  const { admin, unit, project } = owned;
  const [profileResult, documentsResult, linksResult] = await Promise.all([
    admin.from("property_unit_legal_profiles").select("*").eq("unit_id", unit.id).maybeSingle(),
    admin.from("property_project_legal_documents").select("*").eq("project_id", unit.project_id).is("superseded_at", null).order("created_at", { ascending: false }),
    admin.from("property_unit_legal_document_links").select("document_id,link_source,link_reason,linked_at").eq("unit_id", unit.id),
  ]);
  const lookupError = profileResult.error || documentsResult.error || linksResult.error;
  if (lookupError) return fail("Legal-document workspace could not be loaded.", 500, "LEGAL_LOOKUP_FAILED");
  const profile = profileResult.data ?? { plot_numbers: [], deed_numbers: [], mutation_numbers: [], khatian_numbers: [] };
  const linked = new Map((linksResult.data ?? []).map((row: any) => [row.document_id, row]));
  const documents = await Promise.all((documentsResult.data ?? []).map(async (document: any) => {
    const signed = await admin.storage.from(BUCKET).createSignedUrl(document.storage_path, 300);
    return { ...document, privateUrl: signed.data?.signedUrl ?? null, link: linked.get(document.id) ?? null, suggestion: linked.has(document.id) ? null : evaluateCoverage(profile, document) };
  }));
  return NextResponse.json({ ok: true, data: { unit, project, profile, documents } }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest, context: { params: { unitId: string } }) {
  const owned = await ownerContext(clean(context.params.unitId));
  if (owned.response) return owned.response;
  const { admin, user, unit } = owned;
  const body = await request.json().catch(() => null);
  const profile = facts(body);
  const result = await admin.from("property_unit_legal_profiles").upsert({
    unit_id: unit.id, project_id: unit.project_id,
    plot_numbers: profile.plotNumbers, deed_numbers: profile.deedNumbers,
    mutation_numbers: profile.mutationNumbers, khatian_numbers: profile.khatianNumbers,
    updated_by: user.id, updated_at: new Date().toISOString(),
  }, { onConflict: "unit_id" }).select("*").single();
  if (result.error) return fail(result.error.message, 500, "LEGAL_PROFILE_SAVE_FAILED");
  return NextResponse.json({ ok: true, data: result.data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, context: { params: { unitId: string } }) {
  const owned = await ownerContext(clean(context.params.unitId));
  if (owned.response) return owned.response;
  const { admin, user, unit } = owned;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const documentType = clean(form?.get("documentType"));
  const title = clean(form?.get("title"));
  if (!(file instanceof File)) return fail("Choose a legal paper to upload.", 400, "LEGAL_FILE_REQUIRED");
  if (!DOCUMENT_TYPES.has(documentType)) return fail("Choose a supported legal-paper type.", 400, "LEGAL_TYPE_INVALID");
  if (!title || title.length > 180) return fail("Enter a valid document title.", 400, "LEGAL_TITLE_INVALID");
  if (!MIME_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) return fail("Upload a PDF, JPEG, PNG or WEBP file up to 8 MB.", 400, "LEGAL_FILE_INVALID");
  const profileResult = await admin.from("property_unit_legal_profiles").select("*").eq("unit_id", unit.id).maybeSingle();
  if (profileResult.error) return fail("Save the unit identifiers before uploading papers.", 500, "LEGAL_PROFILE_LOOKUP_FAILED");
  const declared = facts(profileResult.data ?? {});
  const bytes = Buffer.from(await file.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "document";
  const path = `${user.id}/${unit.project_id}/${randomUUID()}-${safeName}`;
  const upload = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (upload.error) return fail("The private legal paper could not be uploaded.", 500, "LEGAL_UPLOAD_FAILED");
  const signed = await admin.storage.from(BUCKET).createSignedUrl(path, 600);
  const analysis = signed.data?.signedUrl
    ? await analyseDocument(signed.data.signedUrl, file.type, declared)
    : { status: "failed", confidence: null, model: null, extracted: {}, summary: "The paper was stored, but private analysis access could not be created.", warnings: ["Signed analysis URL failed."] };
  const inserted = await admin.from("property_project_legal_documents").insert({
    project_id: unit.project_id, owner_user_id: user.id, document_type: documentType, title,
    storage_bucket: BUCKET, storage_path: path, original_filename: file.name, mime_type: file.type,
    file_size_bytes: file.size, sha256: digest, declared_facts: declared, extracted_facts: analysis.extracted,
    analysis_status: analysis.status, analysis_confidence: analysis.confidence, analysis_model: analysis.model,
    ai_summary: analysis.summary, ai_warnings: analysis.warnings, uploaded_by: user.id,
  }).select("*").single();
  if (inserted.error || !inserted.data) {
    await admin.storage.from(BUCKET).remove([path]);
    return fail(inserted.error?.message || "The legal-paper record could not be created.", 500, "LEGAL_RECORD_FAILED");
  }
  const link = await admin.from("property_unit_legal_document_links").insert({
    unit_id: unit.id, project_id: unit.project_id, document_id: inserted.data.id,
    link_source: "uploaded_for_unit", link_reason: "Uploaded from this unit's private legal workspace.", linked_by: user.id,
  });
  if (link.error) return fail("The paper was stored but could not be attached to this unit.", 500, "LEGAL_LINK_FAILED");
  return NextResponse.json({ ok: true, data: { document: inserted.data, analysis } }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest, context: { params: { unitId: string } }) {
  const owned = await ownerContext(clean(context.params.unitId));
  if (owned.response) return owned.response;
  const { admin, user, unit } = owned;
  const body = await request.json().catch(() => null);
  const documentId = clean(body?.documentId);
  if (!UUID.test(documentId)) return fail("Choose a valid existing document.", 400, "LEGAL_DOCUMENT_INVALID");
  const [profileResult, documentResult] = await Promise.all([
    admin.from("property_unit_legal_profiles").select("*").eq("unit_id", unit.id).maybeSingle(),
    admin.from("property_project_legal_documents").select("*").eq("id", documentId).eq("project_id", unit.project_id).eq("owner_user_id", user.id).is("superseded_at", null).maybeSingle(),
  ]);
  if (profileResult.error || !profileResult.data) return fail("Save this unit's legal identifiers first.", 409, "LEGAL_PROFILE_REQUIRED");
  if (documentResult.error || !documentResult.data) return fail("The existing paper was not found in this project.", 404, "LEGAL_DOCUMENT_NOT_FOUND");
  const suggestion = evaluateCoverage(profileResult.data, documentResult.data);
  if (suggestion.status !== "reusable") return fail(suggestion.reason, 409, "LEGAL_REUSE_NOT_CONFIRMED");
  const result = await admin.from("property_unit_legal_document_links").upsert({
    unit_id: unit.id, project_id: unit.project_id, document_id: documentId,
    link_source: "ai_reuse_confirmed", link_reason: suggestion.reason, linked_by: user.id, linked_at: new Date().toISOString(),
  }, { onConflict: "unit_id,document_id" });
  if (result.error) return fail(result.error.message, 500, "LEGAL_REUSE_LINK_FAILED");
  return NextResponse.json({ ok: true, data: { documentId, suggestion } }, { headers: { "Cache-Control": "no-store" } });
}
