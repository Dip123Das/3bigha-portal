"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type Option = { id: string; name: string; type_id?: string; category?: string | null };
type Form = Record<string, any>;
const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" };
const text = (value: unknown) => String(value ?? "");

export default function CompleteBuilderUnitPage() {
  const params = useParams<{ projectId: string; unitId: string }>();
  const router = useRouter();
  const projectId = text(params?.projectId);
  const unitId = text(params?.unitId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Form>({});
  const [media, setMedia] = useState<UploadedMediaAsset[]>([]);
  const [types, setTypes] = useState<Option[]>([]);
  const [subtypes, setSubtypes] = useState<Option[]>([]);
  const [amenities, setAmenities] = useState<Option[]>([]);
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [project, setProject] = useState<{ id: string; name: string; slug: string } | null>(null);

  const availableSubtypes = useMemo(
    () => subtypes.filter((item) => item.type_id === form.propertyTypeId),
    [subtypes, form.propertyTypeId],
  );
  const readiness = useMemo(() => {
    const checks = [
      ["Property type", Boolean(form.propertyTypeId)],
      ["Property subtype", Boolean(form.propertySubtypeId)],
      ["Positive price", Number(form.priceTotal) > 0],
      ["Declared area", [form.plotAreaSqft, form.builtUpSqft, form.carpetSqft, form.superBuiltUpSqft].some((value) => Number(value) > 0)],
      ["North boundary", Boolean(text(form.boundaryNorth).trim())],
      ["South boundary", Boolean(text(form.boundarySouth).trim())],
      ["East boundary", Boolean(text(form.boundaryEast).trim())],
      ["West boundary", Boolean(text(form.boundaryWest).trim())],
      ["Exact-unit Trusted Media", media.length > 0],
    ] as const;
    return { checks, complete: checks.every(([, complete]) => complete), done: checks.filter(([, complete]) => complete).length };
  }, [form, media]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError("");
      const response = await fetch(`/api/property/builder/units/${encodeURIComponent(unitId)}`, { cache: "no-store" });
      const result = await response.json().catch(() => null);
      if (cancelled) return;
      if (!response.ok || !result?.ok) { setError(result?.error?.message || "Unit could not be loaded."); setLoading(false); return; }
      const unit = result.data.unit;
      setProject(unit.builder_project ?? null);
      setForm({
        unitCode: unit.unit_code ?? "", title: unit.title ?? "", propertyTypeId: unit.property_type_id ?? "",
        propertySubtypeId: unit.property_subtype_id ?? "", tower: unit.tower ?? "", block: unit.block ?? "",
        floorNo: unit.floor_no ?? "", unitNo: unit.unit_no ?? "", facing: unit.facing ?? "",
        plotAreaSqft: unit.plot_area_sqft ?? "", builtUpSqft: unit.built_up_sqft ?? "", carpetSqft: unit.carpet_sqft ?? "",
        superBuiltUpSqft: unit.super_built_up_sqft ?? "", dimensionLengthFt: unit.dimension_length_ft ?? "",
        dimensionWidthFt: unit.dimension_width_ft ?? "", boundaryNorth: unit.boundary_north ?? "",
        boundarySouth: unit.boundary_south ?? "", boundaryEast: unit.boundary_east ?? "", boundaryWest: unit.boundary_west ?? "",
        availabilityNote: unit.availability_note ?? "", priceTotal: result.data.pricing?.price_total ?? "", trustStatus: unit.trust_status,
      });
      setMedia(Array.isArray(unit.trusted_media_json) ? unit.trusted_media_json : []);
      setTypes(result.data.propertyTypes ?? []); setSubtypes(result.data.propertySubtypes ?? []);
      setAmenities(result.data.amenities ?? []); setAmenityIds(result.data.selectedAmenityIds ?? []);
      setLoading(false);
    })().catch((cause) => { if (!cancelled) { setError(cause?.message || "Unit could not be loaded."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [unitId]);

  function update(key: string, value: unknown) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleAmenity(id: string) { setAmenityIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  async function save(mode: "draft" | "verify") {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/property/builder/units/${encodeURIComponent(unitId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, unit: { ...form, trustedMediaJson: media }, amenityIds }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error?.message || "Unit could not be saved.");
      setMessage(mode === "verify" ? "Unit details and exact Trusted Media were verified and saved." : "Unit draft saved. You can return and complete the remaining items later.");
      if (mode === "verify") update("trustStatus", "verified");
    } catch (cause: any) { setError(cause?.message || "Unit could not be saved."); }
    finally { setSaving(false); }
  }

  const field = (label: string, key: string, placeholder = "") => (
    <label><div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <input value={form[key] ?? ""} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} style={inputStyle} disabled={saving} />
    </label>
  );

  return <Container>
    <SectionHeader title="Complete Exact Unit" subtitle="Complete the facts and evidence that belong only to this unit."
      right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/property/builder/projects/${encodeURIComponent(projectId)}/units`}><ActionButton variant="secondary">Back to Units</ActionButton></Link>
        {project?.slug ? <Link href={`/property/projects/${encodeURIComponent(project.slug)}?preview=builder`}><ActionButton variant="secondary">Preview as Buyer</ActionButton></Link> : null}
      </div>} />
    {loading ? <Card><CardBody>Loading exact unit…</CardBody></Card> : error && !form.unitCode ? <Card><CardBody>{error}</CardBody></Card> : <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge>Project: {project?.name || projectId}</Badge><Badge>Unit: {form.unitCode}</Badge>
        <Badge>Readiness: {readiness.done}/{readiness.checks.length}</Badge><Badge>Trust: {form.trustStatus || "pending"}</Badge>
      </div>
      {error ? <div style={{ padding: 12, borderRadius: 10, background: "#fef2f2", color: "#991b1b", marginBottom: 12 }}>{error}</div> : null}
      {message ? <div style={{ padding: 12, borderRadius: 10, background: "#ecfdf5", color: "#065f46", marginBottom: 12 }}>{message}</div> : null}
      <Card><CardBody>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Unit identity and classification</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {field("Unit code *", "unitCode", "e.g. A-401")}{field("Unit title", "title")}{field("Unit number", "unitNo")}{field("Tower", "tower")}{field("Block", "block")}{field("Floor", "floorNo")}
          <label><div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Property type *</div><select value={form.propertyTypeId ?? ""} onChange={(event) => setForm((current) => ({ ...current, propertyTypeId: event.target.value, propertySubtypeId: "" }))} style={inputStyle}><option value="">Select type</option>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Property subtype *</div><select value={form.propertySubtypeId ?? ""} onChange={(event) => update("propertySubtypeId", event.target.value)} style={inputStyle}><option value="">Select subtype</option>{availableSubtypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
      </CardBody></Card>
      <div style={{ height: 12 }} />
      <Card><CardBody>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Exact measurements and price</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          {field("Price ₹ *", "priceTotal")}{field("Plot area (sqft)", "plotAreaSqft")}{field("Built-up area (sqft)", "builtUpSqft")}{field("Carpet area (sqft)", "carpetSqft")}{field("Super built-up area (sqft)", "superBuiltUpSqft")}{field("Length (ft)", "dimensionLengthFt")}{field("Width (ft)", "dimensionWidthFt")}{field("Facing", "facing")}
        </div>
      </CardBody></Card>
      <div style={{ height: 12 }} />
      <Card><CardBody>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Four boundaries — mandatory</div>
        <div style={{ fontSize: 13, opacity: .75, marginBottom: 12 }}>Enter the actual adjoining property, road or landmark on every side. AI must not invent these facts.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {field("North boundary *", "boundaryNorth")}{field("South boundary *", "boundarySouth")}{field("East boundary *", "boundaryEast")}{field("West boundary *", "boundaryWest")}
        </div>
      </CardBody></Card>
      <div style={{ height: 12 }} />
      <Card><CardBody>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Amenities for this exact unit</div>
        <div style={{ fontSize: 13, opacity: .75, marginBottom: 12 }}>Common defaults may already be selected. Add or remove exceptions for this unit.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8 }}>
          {amenities.map((item) => <label key={item.id} style={{ display: "flex", gap: 8 }}><input type="checkbox" checked={amenityIds.includes(item.id)} onChange={() => toggleAmenity(item.id)} /><span>{item.name}</span></label>)}
        </div>
      </CardBody></Card>
      <div style={{ height: 12 }} />
      <Card><CardBody>
        <UniversalMediaUploader module="property" value={media} onChange={setMedia} label="Exact-unit photos / video" helperText="Capture genuine GPS-backed evidence of this exact unit. Project or another unit's media cannot be reused." allowImages allowVideos allowDocuments={false} maxFiles={15} uploadStrategy="trusted" mandatoryTrustedCaptures={1} inlineCamera cameraFacing="environment" folder={`builder-units/${projectId}/${unitId}`} assetMetadata={{ evidenceCategory: "builder_inventory_unit", listingKind: "builder_unit", builderProjectId: projectId, builderUnitId: unitId }} />
      </CardBody></Card>
      <div style={{ height: 12 }} />
      <Card><CardBody>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Verification readiness</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8 }}>
          {readiness.checks.map(([label, complete]) => <div key={label} style={{ padding: 9, borderRadius: 9, background: complete ? "#ecfdf5" : "#fff7ed", color: complete ? "#065f46" : "#9a3412" }}>{complete ? "✓" : "○"} {label}</div>)}
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionButton variant="secondary" onClick={() => save("draft")} disabled={saving}>{saving ? "Saving…" : "Save Draft"}</ActionButton>
          <ActionButton onClick={() => save("verify")} disabled={saving || !readiness.complete}>{saving ? "Verifying…" : "Verify and Complete Unit"}</ActionButton>
          <ActionButton variant="secondary" onClick={() => router.push(`/property/builder/projects/${encodeURIComponent(projectId)}/units`)} disabled={saving}>Return to Units</ActionButton>
        </div>
      </CardBody></Card>
    </>}
  </Container>;
}
