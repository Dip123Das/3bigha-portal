"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" };
const DOCUMENT_TYPES = [
  ["title_deed", "Title deed / sale deed"], ["mutation", "Mutation record"],
  ["khatian_ror", "Khatian / Record of Rights"], ["land_revenue_tax", "Land revenue tax receipt"],
  ["panchayat_tax", "Panchayat tax receipt"], ["municipality_tax", "Municipality tax receipt"],
  ["conversion", "Land conversion paper"], ["sanctioned_plan", "Sanctioned plan"],
  ["possession", "Possession document"], ["other", "Other property paper"],
] as const;
const label = (key: string) => DOCUMENT_TYPES.find(([value]) => value === key)?.[1] ?? key.replace(/_/g, " ");
const csv = (value: unknown) => Array.isArray(value) ? value.join(", ") : "";

type Workspace = {
  unit: { id: string; unit_code: string; title: string | null };
  project: { id: string; name: string };
  profile: Record<string, any>;
  documents: Array<Record<string, any>>;
};

export default function UnitLegalDocumentsPage() {
  const params = useParams<{ projectId: string; unitId: string }>();
  const projectId = String(params?.projectId ?? "");
  const unitId = String(params?.unitId ?? "");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({ plotNumbers: "", deedNumbers: "", mutationNumbers: "", khatianNumbers: "" });
  const [documentType, setDocumentType] = useState("title_deed");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dismissedPrompt, setDismissedPrompt] = useState(false);

  async function load() {
    setLoading(true); setError("");
    const response = await fetch(`/api/property/builder/units/${encodeURIComponent(unitId)}/legal-documents`, { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) { setError(result?.error?.message || "Legal-paper workspace could not be loaded."); setLoading(false); return; }
    const data = result.data as Workspace;
    setWorkspace(data);
    setProfile({
      plotNumbers: csv(data.profile?.plot_numbers), deedNumbers: csv(data.profile?.deed_numbers),
      mutationNumbers: csv(data.profile?.mutation_numbers), khatianNumbers: csv(data.profile?.khatian_numbers),
    });
    setLoading(false);
  }

  useEffect(() => { void load(); }, [unitId]);

  const reusable = useMemo(() => workspace?.documents.filter((document) => !document.link && document.suggestion?.status === "reusable") ?? [], [workspace]);
  const partial = useMemo(() => workspace?.documents.filter((document) => !document.link && document.suggestion?.status === "partial") ?? [], [workspace]);
  const linked = useMemo(() => workspace?.documents.filter((document) => document.link) ?? [], [workspace]);
  const prompt = !dismissedPrompt ? reusable[0] : null;

  function payload() {
    return {
      plotNumbers: profile.plotNumbers, deedNumbers: profile.deedNumbers,
      mutationNumbers: profile.mutationNumbers, khatianNumbers: profile.khatianNumbers,
    };
  }

  async function saveProfile() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/property/builder/units/${encodeURIComponent(unitId)}/legal-documents`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error?.message || "Identifiers could not be saved.");
      setMessage("Legal identifiers saved. Existing private papers were compared again.");
      setDismissedPrompt(false); await load();
    } catch (cause: any) { setError(cause?.message || "Identifiers could not be saved."); }
    finally { setSaving(false); }
  }

  async function upload() {
    if (!file) { setError("Choose a PDF or image of the legal paper."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const body = new FormData(); body.set("file", file); body.set("documentType", documentType); body.set("title", title || label(documentType));
      const response = await fetch(`/api/property/builder/units/${encodeURIComponent(unitId)}/legal-documents`, { method: "POST", body });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error?.message || "Paper could not be uploaded.");
      setMessage(result.data?.analysis?.status === "completed"
        ? "Paper stored privately, attached to this unit and analysed for reusable identifiers."
        : "Paper stored privately and attached. AI extraction needs review or retry later.");
      setFile(null); setTitle(""); await load();
    } catch (cause: any) { setError(cause?.message || "Paper could not be uploaded."); }
    finally { setSaving(false); }
  }

  async function linkDocument(documentId: string) {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/property/builder/units/${encodeURIComponent(unitId)}/legal-documents`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error?.message || "Existing paper could not be linked.");
      setMessage("Existing private paper linked after your confirmation. No duplicate upload was created.");
      setDismissedPrompt(false); await load();
    } catch (cause: any) { setError(cause?.message || "Existing paper could not be linked."); }
    finally { setSaving(false); }
  }

  const field = (titleText: string, key: keyof typeof profile, placeholder: string) => <label>
    <div style={{ fontSize: 12, fontWeight: 850, marginBottom: 6 }}>{titleText}</div>
    <input style={inputStyle} value={profile[key]} placeholder={placeholder} onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} disabled={saving} />
  </label>;

  const documentCard = (document: Record<string, any>, action = false) => <div key={document.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div><div style={{ fontWeight: 900 }}>{document.title}</div><div style={{ fontSize: 12, opacity: .72 }}>{label(document.document_type)} · AI {document.analysis_status} {document.analysis_confidence != null ? `(${document.analysis_confidence}%)` : ""}</div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {document.privateUrl ? <a href={document.privateUrl} target="_blank" rel="noreferrer"><ActionButton variant="secondary">Open Private Paper</ActionButton></a> : null}
        {action ? <ActionButton onClick={() => linkDocument(document.id)} disabled={saving}>Link Existing Paper</ActionButton> : null}
      </div>
    </div>
    {document.ai_summary ? <div style={{ marginTop: 8, fontSize: 13 }}>{document.ai_summary}</div> : null}
    {document.suggestion?.reason ? <div style={{ marginTop: 8, padding: 9, borderRadius: 9, background: document.suggestion.status === "reusable" ? "#ecfdf5" : "#fff7ed", color: document.suggestion.status === "reusable" ? "#065f46" : "#9a3412", fontSize: 13 }}>{document.suggestion.reason}</div> : null}
  </div>;

  return <Container>
    <SectionHeader title="Private Legal Papers" subtitle="Reuse verified project papers without uploading the same deed, mutation or tax record for every unit."
      right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link href={`/property/builder/projects/${encodeURIComponent(projectId)}/units/${encodeURIComponent(unitId)}/complete`}><ActionButton variant="secondary">Complete Unit</ActionButton></Link><Link href={`/property/builder/projects/${encodeURIComponent(projectId)}/units`}><ActionButton variant="secondary">Back to Units</ActionButton></Link></div>} />
    {prompt ? <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,.58)", display: "grid", placeItems: "center", padding: 18 }}>
      <div style={{ width: "min(620px,100%)", background: "white", borderRadius: 18, padding: 20, boxShadow: "0 24px 80px rgba(0,0,0,.3)" }}>
        <div style={{ color: "#1d4ed8", fontWeight: 950, fontSize: 12 }}>AI-ASSISTED REUSE SUGGESTION</div>
        <h2 style={{ margin: "8px 0" }}>This unit appears to use an existing legal paper</h2>
        <p style={{ lineHeight: 1.55 }}>{prompt.suggestion.reason} AI is advisory; the paper will be linked only if you confirm.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><ActionButton onClick={() => linkDocument(prompt.id)} disabled={saving}>Confirm and Link Paper</ActionButton><ActionButton variant="secondary" onClick={() => setDismissedPrompt(true)} disabled={saving}>Review Manually</ActionButton></div>
      </div>
    </div> : null}
    {error ? <div style={{ padding: 12, borderRadius: 10, background: "#fef2f2", color: "#991b1b", marginBottom: 12 }}>{error}</div> : null}
    {message ? <div style={{ padding: 12, borderRadius: 10, background: "#ecfdf5", color: "#065f46", marginBottom: 12 }}>{message}</div> : null}
    {loading ? <Card><CardBody>Loading private legal workspace…</CardBody></Card> : !workspace ? null : <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}><Badge>Project: {workspace.project.name}</Badge><Badge>Unit: {workspace.unit.unit_code}</Badge><Badge>Linked papers: {linked.length}</Badge></div>
      <Card><CardBody>
        <div style={{ fontWeight: 950, fontSize: 18 }}>1. Declare this unit’s legal identifiers</div>
        <div style={{ margin: "5px 0 12px", fontSize: 13, opacity: .75 }}>Enter multiple values separated by commas. These declarations guide matching; they do not prove legal validity.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>{field("Plot number(s)", "plotNumbers", "e.g. 2029, 2030")}{field("Title/sale deed number(s)", "deedNumbers", "e.g. I-1234/2024")}{field("Mutation number(s)", "mutationNumbers", "e.g. MUT-456")}{field("Khatian / RoR number(s)", "khatianNumbers", "e.g. LR-789")}</div>
        <div style={{ marginTop: 12 }}><ActionButton onClick={saveProfile} disabled={saving}>{saving ? "Saving…" : "Save and Check Existing Papers"}</ActionButton></div>
      </CardBody></Card>
      <div style={{ height: 12 }} />
      {reusable.length ? <Card><CardBody><div style={{ fontWeight: 950, fontSize: 18, color: "#065f46", marginBottom: 10 }}>2. Existing papers recommended for reuse</div><div style={{ display: "grid", gap: 10 }}>{reusable.map((document) => documentCard(document, true))}</div></CardBody></Card> : null}
      {partial.length ? <><div style={{ height: 12 }} /><Card><CardBody><div style={{ fontWeight: 950, fontSize: 18, color: "#9a3412", marginBottom: 10 }}>Additional paper coverage required</div><div style={{ display: "grid", gap: 10 }}>{partial.map((document) => documentCard(document))}</div></CardBody></Card></> : null}
      <div style={{ height: 12 }} />
      <Card><CardBody>
        <div style={{ fontWeight: 950, fontSize: 18 }}>3. Upload only a new or additional paper</div>
        <div style={{ margin: "5px 0 12px", fontSize: 13, opacity: .75 }}>The file remains private. AI extracts visible identifiers for comparison but never gives legal approval or a title-clearance decision.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <label><div style={{ fontSize: 12, fontWeight: 850, marginBottom: 6 }}>Paper type</div><select style={inputStyle} value={documentType} onChange={(event) => setDocumentType(event.target.value)} disabled={saving}>{DOCUMENT_TYPES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
          <label><div style={{ fontSize: 12, fontWeight: 850, marginBottom: 6 }}>Document title</div><input style={inputStyle} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={label(documentType)} disabled={saving} /></label>
          <label><div style={{ fontSize: 12, fontWeight: 850, marginBottom: 6 }}>Private file (PDF/image, max 8 MB)</div><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" style={inputStyle} onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={saving} /></label>
        </div>
        <div style={{ marginTop: 12 }}><ActionButton onClick={upload} disabled={saving || !file}>{saving ? "Uploading and analysing…" : "Upload Privately and Attach"}</ActionButton></div>
      </CardBody></Card>
      <div style={{ height: 12 }} />
      <Card><CardBody><div style={{ fontWeight: 950, fontSize: 18, marginBottom: 10 }}>Linked papers for this unit</div>{linked.length ? <div style={{ display: "grid", gap: 10 }}>{linked.map((document) => documentCard(document))}</div> : <div style={{ opacity: .72 }}>No legal paper is linked yet.</div>}</CardBody></Card>
      <div style={{ margin: "12px 0", padding: 12, borderRadius: 10, background: "#eff6ff", color: "#1e3a8a", fontSize: 13 }}><b>Privacy:</b> buyers and the public cannot open these papers. Future controlled disclosure will require a genuine booking/purchase decision and a separate access workflow.</div>
    </>}
  </Container>;
}
