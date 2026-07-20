"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  exact?: {
    premises?: string;
    addressLine?: string;
    landmark?: string;
    formattedAddress?: string;
    mapLink?: string;
    latitude?: string;
    longitude?: string;
  };
};

const moduleLabels: Record<ModuleChoice, string> = {
  materials: "Materials",
  services: "Services",
  rentals: "Machinery / Rentals",
  properties: "Property",
};

const modeLabels: Record<string, string> = {
  type: "Typed requirement",
  photo: "Photo / handwritten note",
  document: "Document / BOQ / drawing",
  voice: "Existing audio recording",
  guided: "Guided assistance",
};

function safeNumber(value: string) {
  if (!value.trim()) return null;
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RfqReviewPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const submittingRef = useRef(false);

  const [handoff, setHandoff] = useState<RfqHandoff | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as RfqHandoff;
      if (parsed?.version === 1 && parsed?.module && parsed?.item) {
        setHandoff(parsed);
      }
    } catch {
      setError(
        "The saved requirement could not be read. Please return to the simple form."
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsAuthenticated(Boolean(data.user?.id));
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!handoff) return;
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
  }, [handoff]);

  function update<K extends keyof RfqHandoff>(
    key: K,
    value: RfqHandoff[K]
  ) {
    setHandoff((current) =>
      current ? { ...current, [key]: value } : current
    );
    setConfirmed(false);
    setError("");
  }

  function addFiles(nextFiles: File[]) {
    setFiles((current) => {
      const seen = new Set(
        current.map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      );

      const unique = nextFiles.filter((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return [...current, ...unique];
    });
    setConfirmed(false);
    setError("");
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setConfirmed(false);
  }

  async function submit() {
    if (!handoff || loading || submittingRef.current) return;

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

    if (!handoff.item.trim()) {
      return setError("Please enter what you need.");
    }

    const needsMeasurement = handoff.module === "materials" || handoff.module === "rentals";

    if (needsMeasurement && !handoff.qty.trim()) {
      return setError("Please enter the quantity.");
    }

    if (needsMeasurement && !handoff.unit.trim()) {
      return setError("Please enter the unit.");
    }

    if (!city || !locality || !pincode) {
      return setError("Please return and select a location with a PIN code.");
    }

    if (!isAuthenticated && !handoff.phone.trim() && !handoff.email.trim()) {
      return setError("Please provide a phone number or email address.");
    }

    if (!confirmed) {
      return setError(
        "Please confirm that you reviewed the requirement before submission."
      );
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const attachments: Array<{
        bucket: string;
        object_path: string;
        file_name: string;
        mime_type: string | null;
        file_size: number | null;
      }> = [];

      const uploadFolder = `public-${Date.now()}`;

      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
        const objectPath = `${uploadFolder}/${Date.now()}_${safeName}`;

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
            handoff.exact?.formattedAddress,
            handoff.exact?.mapLink,
            !handoff.exact?.formattedAddress ? handoff.geo.placeName : null,
            !handoff.exact?.formattedAddress ? handoff.geo.blockName : null,
            !handoff.exact?.formattedAddress ? handoff.geo.districtName : null,
            !handoff.exact?.formattedAddress ? handoff.geo.stateName : null,
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
    } catch (cause: unknown) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Something went wrong while creating the RFQ.";

      setError(message);
      setConfirmed(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (!handoff) {
    return (
      <main
        className="container pageBody"
        style={{ paddingTop: 24, paddingBottom: 40 }}
      >
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

  const locationText = [
    handoff.exact?.formattedAddress,
    handoff.exact?.mapLink,
    !handoff.exact?.formattedAddress ? handoff.geo.placeName : null,
    !handoff.exact?.formattedAddress ? handoff.geo.blockName : null,
    !handoff.exact?.formattedAddress ? handoff.geo.subdivisionName : null,
    !handoff.exact?.formattedAddress ? handoff.geo.districtName : null,
    !handoff.exact?.formattedAddress ? handoff.geo.stateName : null,
    !handoff.exact?.formattedAddress ? handoff.geo.pincode : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main
      className="container pageBody"
      style={{ paddingTop: 24, paddingBottom: 40 }}
    >
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
            FINAL HUMAN CONFIRMATION
          </div>
          <h1 style={{ margin: "6px 0" }}>
            Review your requirement before submission
          </h1>
          <p style={{ margin: 0, fontWeight: 700, color: "#475569" }}>
            3Bigha has carried your information here. Nothing will be submitted
            until you review and confirm it.
          </p>
        </header>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
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

        <section className="reviewSection">
          <div className="reviewMeta">
            <div>
              <span>Purpose</span>
              <strong>{moduleLabels[handoff.module]}</strong>
            </div>
            <div>
              <span>Input method</span>
              <strong>{modeLabels[handoff.mode] || handoff.mode}</strong>
            </div>
          </div>
        </section>

        <section className="reviewSection">
          <h2>Requirement</h2>

          <label>
            <b>What do you need? *</b>
            <input
              className="searchInput"
              value={handoff.item}
              onChange={(event) => update("item", event.target.value)}
            />
          </label>

          <div className="rfqReviewGrid">
            <label>
              <b>Quantity {handoff.module === "materials" || handoff.module === "rentals" ? "*" : "(optional)"}</b>
              <input
                className="searchInput"
                value={handoff.qty}
                onChange={(event) => update("qty", event.target.value)}
              />
            </label>
            <label>
              <b>Unit {handoff.module === "materials" || handoff.module === "rentals" ? "*" : "(optional)"}</b>
              <input
                className="searchInput"
                value={handoff.unit}
                onChange={(event) => update("unit", event.target.value)}
              />
            </label>
          </div>

          <label>
            <b>When do you need it?</b>
            <select
              className="searchInput"
              value={handoff.neededBy}
              onChange={(event) => update("neededBy", event.target.value)}
            >
              <option value="">Select timeline</option>
              <option>Today</option>
              <option>Tomorrow</option>
              <option>Within 3 days</option>
              <option>Within 1 week</option>
              <option>Flexible</option>
            </select>
          </label>

          <label>
            <b>Notes</b>
            <textarea
              value={handoff.notes}
              onChange={(event) => update("notes", event.target.value)}
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

        <section className="reviewSection">
          <h2>Delivery / Work Location</h2>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {locationText || "No location has been selected."}
          </p>
          {handoff.exact?.latitude && handoff.exact?.longitude ? (
            <a
              className="inlineAction"
              href={`https://www.google.com/maps?q=${handoff.exact.latitude},${handoff.exact.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Confirm exact point in Google Maps
            </a>
          ) : null}
          <Link className="inlineAction" href="/rfq">
            Change location in simple form
          </Link>
        </section>

        <section className="reviewSection">
          <h2>Attachments</h2>
          <input
            type="file"
            multiple
            accept="image/*,audio/*,application/pdf,.xls,.xlsx,.csv,.dwg,.dxf"
            onChange={(event) => {
              const selected = event.target.files
                ? Array.from(event.target.files)
                : [];
              addFiles(selected);
              event.target.value = "";
            }}
          />
          <p style={{ color: "#64748b", fontWeight: 700 }}>
            Add handwritten notes, photos, PDFs, BOQs, drawings or voice recordings.
          </p>

          {files.length > 0 ? (
            <div className="fileList">
              {files.map((file, index) => (
                <div
                  className="fileRow"
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                >
                  <div>
                    <strong>{file.name}</strong>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="emptyFileState">No attachments selected.</div>
          )}
        </section>

        <section className="reviewSection">
          <h2>Contact</h2>
          <div className="rfqReviewGrid three">
            <label>
              <b>Name</b>
              <input
                className="searchInput"
                placeholder="Name"
                value={handoff.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </label>
            <label>
              <b>Phone</b>
              <input
                className="searchInput"
                placeholder="Phone"
                value={handoff.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </label>
            <label>
              <b>Email</b>
              <input
                className="searchInput"
                placeholder="Email"
                value={handoff.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </label>
          </div>
          <p style={{ marginBottom: 0, color: "#64748b", fontWeight: 700 }}>
            {isAuthenticated
              ? "Your signed-in account can receive responses. Contact details are optional."
              : "A phone number or email address is required when you are not signed in."}
          </p>
        </section>

        <section className="confirmationSection">
          <label className="confirmationLabel">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={loading}
              onChange={(event) => {
                setConfirmed(event.target.checked);
                setError("");
              }}
            />
            <span>
              I have reviewed this requirement and confirm that the information
              is correct. I understand that sending it will make it available
              to relevant businesses through 3Bigha.
            </span>
          </label>
        </section>

        <div className="rfqReviewActions">
          <button
            className="topBtn topBtnPrimary"
            type="button"
            disabled={loading || !confirmed}
            onClick={submit}
          >
            {loading ? "Sending requirement..." : "Confirm and send requirement"}
          </button>

          <Link className="topBtn topBtnGhost" href="/rfq" aria-disabled={loading}>
            Edit in simple form
          </Link>

          <Link
            className="topBtn topBtnGhost"
            href={`/rfq/new?module=${handoff.module}&query=${encodeURIComponent(
              handoff.item
            )}`}
            aria-disabled={loading}
          >
            Open professional workspace
          </Link>
        </div>

        <p className="submissionNote">
          Assistance does not send this requirement. It is sent only through your confirmation above.
        </p>
      </div>

      <style jsx>{`
        .reviewSection {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 16px;
          display: grid;
          gap: 12px;
          background: #ffffff;
        }
        .reviewSection h2 {
          margin: 0;
          font-size: 20px;
        }
        .reviewMeta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .reviewMeta > div {
          border-radius: 14px;
          background: #f8fafc;
          padding: 14px;
          display: grid;
          gap: 4px;
        }
        .reviewMeta span {
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
        }
        .rfqReviewGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .rfqReviewGrid.three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .inlineAction {
          color: #0f766e;
          font-weight: 800;
          text-decoration: underline;
          width: fit-content;
        }
        .fileList {
          display: grid;
          gap: 8px;
        }
        .fileRow {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .fileRow > div {
          min-width: 0;
          display: grid;
          gap: 2px;
        }
        .fileRow strong {
          overflow-wrap: anywhere;
        }
        .fileRow span {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }
        .fileRow button {
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 7px 10px;
          background: #fff;
          color: #b91c1c;
          font-weight: 800;
          cursor: pointer;
        }
        .emptyFileState {
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          padding: 12px;
          color: #64748b;
          font-weight: 700;
        }
        .confirmationSection {
          border: 1px solid #86efac;
          border-radius: 18px;
          padding: 16px;
          background: #f0fdf4;
        }
        .confirmationLabel {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: #14532d;
          font-weight: 800;
          line-height: 1.5;
          cursor: pointer;
        }
        .confirmationLabel input {
          width: 20px;
          height: 20px;
          margin-top: 2px;
          flex: 0 0 auto;
        }
        .rfqReviewActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .submissionNote {
          margin: 0;
          text-align: center;
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
        }
        @media (max-width: 700px) {
          .reviewMeta,
          .rfqReviewGrid,
          .rfqReviewGrid.three {
            grid-template-columns: 1fr;
          }
          .rfqReviewActions > * {
            width: 100%;
            text-align: center;
          }
          .fileRow {
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}
