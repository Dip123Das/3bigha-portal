"use client";

import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";

type Props = {
  assets: UploadedMediaAsset[];
  onChange: (assets: UploadedMediaAsset[]) => void;
  disabled?: boolean;
  documentVerification?: any;
  documentVerifyLoading?: boolean;
  onRunDocumentVerification: () => void;
};

type LegalProofKind = "gst" | "trade-license" | "udyam" | "other";

function belongsTo(asset: UploadedMediaAsset, category: string) {
  return String(asset.path || "").includes(`/${category}/`);
}

function belongsToLegalKind(asset: UploadedMediaAsset, kind: LegalProofKind) {
  return String(asset.path || "").includes(`/legal-proof/${kind}/`);
}

function replaceCategory(
  allAssets: UploadedMediaAsset[],
  category: string,
  nextCategoryAssets: UploadedMediaAsset[]
) {
  return [
    ...allAssets.filter((asset) => !belongsTo(asset, category)),
    ...nextCategoryAssets,
  ];
}

function replaceLegalKind(
  allAssets: UploadedMediaAsset[],
  kind: LegalProofKind,
  nextKindAssets: UploadedMediaAsset[]
) {
  return [
    ...allAssets.filter((asset) => !belongsToLegalKind(asset, kind)),
    ...nextKindAssets,
  ];
}

function RequirementStatus({
  complete,
  children,
}: {
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        background: complete ? "#f0fdf4" : "#fff7ed",
        border: complete ? "1px solid #bbf7d0" : "1px solid #fed7aa",
        color: complete ? "#166534" : "#9a3412",
        fontWeight: 850,
        fontSize: 13,
      }}
    >
      {complete ? "✓ Added" : "Required"} — {children}
    </div>
  );
}

function LegalProofCard({
  title,
  description,
  kind,
  assets,
  allAssets,
  onChange,
  verification,
}: {
  title: string;
  description: string;
  kind: LegalProofKind;
  assets: UploadedMediaAsset[];
  allAssets: UploadedMediaAsset[];
  onChange: (assets: UploadedMediaAsset[]) => void;
  verification?: any;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid #dbeafe",
        background: "#fff",
      }}
    >
      <div style={{ fontWeight: 950, color: "#0f172a" }}>{title}</div>
      <div
        style={{
          marginTop: 5,
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        {description}
      </div>

      {verification ? (
        <div
          style={{
            marginTop: 10,
            padding: "8px 10px",
            borderRadius: 10,
            background:
              verification.status === "verified_by_ai"
                ? "#f0fdf4"
                : verification.status === "document_mismatch" ||
                  verification.status === "format_invalid"
                ? "#fef2f2"
                : "#fff7ed",
            border:
              verification.status === "verified_by_ai"
                ? "1px solid #bbf7d0"
                : verification.status === "document_mismatch" ||
                  verification.status === "format_invalid"
                ? "1px solid #fecaca"
                : "1px solid #fed7aa",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <b>
            {String(
              verification.status || "needs_manual_review"
            ).replace(/_/g, " ")}
          </b>
          {verification.summary ? (
            <div style={{ marginTop: 3 }}>
              {verification.summary}
            </div>
          ) : null}
        </div>
      ) : null}

      <UniversalMediaUploader
        module="vendor"
        folder={`vendor/legal-proof/${kind}/${Date.now()}`}
        value={assets}
        onChange={(next) =>
          onChange(replaceLegalKind(allAssets, kind, next))
        }
        label={`${title} PDF`}
        helperText="Upload the corresponding certificate as a PDF. Photos and videos are not accepted in this legal-proof slot."
        allowImages={false}
        allowVideos={false}
        allowDocuments
        maxFiles={1}
      />
    </div>
  );
}

export default function BusinessVerificationPanel({
  assets,
  onChange,
  disabled = false,
  documentVerification,
  documentVerifyLoading = false,
  onRunDocumentVerification,
}: Props) {
  const legacyLegalAssets = assets.filter(
    (asset) =>
      belongsTo(asset, "legal-proof") &&
      !(["gst", "trade-license", "udyam", "other"] as LegalProofKind[]).some(
        (kind) => belongsToLegalKind(asset, kind)
      )
  );

  const gstAssets = assets.filter((asset) => belongsToLegalKind(asset, "gst"));
  const tradeLicenseAssets = assets.filter((asset) =>
    belongsToLegalKind(asset, "trade-license")
  );
  const udyamAssets = assets.filter((asset) =>
    belongsToLegalKind(asset, "udyam")
  );
  const otherLegalAssets = assets.filter((asset) =>
    belongsToLegalKind(asset, "other")
  );

  const structuredLegalAssets = [
    ...gstAssets,
    ...tradeLicenseAssets,
    ...udyamAssets,
    ...otherLegalAssets,
  ];

  const legalAssets = [...structuredLegalAssets, ...legacyLegalAssets];
  const practicalAssets = assets.filter((asset) =>
    belongsTo(asset, "practical-proof")
  );
  const selfieAssets = assets.filter((asset) =>
    belongsTo(asset, "live-selfie")
  );

  const legalComplete = legalAssets.length > 0;
  const practicalComplete = practicalAssets.length > 0;
  const selfieComplete = selfieAssets.length > 0;

  const documentResults = Array.isArray(
    documentVerification?.documents
  )
    ? documentVerification.documents
    : [];

  function verificationFor(type: string) {
    return documentResults.find(
      (item: any) =>
        String(item?.documentType || "") === type
    );
  }

  return (
    <section
      id="sec-documents"
      style={{
        padding: 18,
        border: "1px solid #bfdbfe",
        borderRadius: 18,
        background: "#f8fbff",
        scrollMarginTop: 190,
      }}
    >
      <div
        style={{
          color: "#1d4ed8",
          fontSize: 12,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        Business verification
      </div>

      <h3 style={{ margin: "6px 0" }}>
        Prove your business in three simple ways
      </h3>

      <p style={{ margin: "0 0 14px", color: "#475569", lineHeight: 1.6 }}>
        Legal proof confirms registration. Physical proof shows the real
        workplace or business activity. A live business-board selfie confirms
        that the person completing this profile is present at the declared
        business.
      </p>

      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <RequirementStatus complete={legalComplete}>
          At least one Legal Business Proof
        </RequirementStatus>
        <RequirementStatus complete={practicalComplete}>
          At least one Physical Business Proof
        </RequirementStatus>
        <RequirementStatus complete={selfieComplete}>
          Live Business-Board Selfie
        </RequirementStatus>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div id="sec-legal-proof" style={{ scrollMarginTop: 190 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
            }}
          >
            <div style={{ fontWeight: 950, color: "#1e3a8a", fontSize: 16 }}>
              1. Legal Business Proof — Mandatory
            </div>
            <p
              style={{
                margin: "7px 0 14px",
                color: "#475569",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Upload only the documents that apply to your business. At least
              one valid registration proof is required. Each number entered in
              Business Identity must have its corresponding certificate here.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              <LegalProofCard
                title="GST Registration"
                description="For the GSTIN entered in Business Identity."
                kind="gst"
                assets={gstAssets}
                allAssets={assets}
                onChange={onChange}
                verification={verificationFor("gst")}
              />
              <LegalProofCard
                title="Trade Licence"
                description="For the Trade Licence number entered in Business Identity."
                kind="trade-license"
                assets={tradeLicenseAssets}
                allAssets={assets}
                onChange={onChange}
                verification={verificationFor("trade_license")}
              />
              <LegalProofCard
                title="UDYAM Registration"
                description="For the UDYAM number entered in Business Identity."
                kind="udyam"
                assets={udyamAssets}
                allAssets={assets}
                onChange={onChange}
                verification={verificationFor("udyam")}
              />
              <LegalProofCard
                title="Other Legal Registration"
                description="PAN, FSSAI, Shop & Establishment, professional registration or another applicable business certificate."
                kind="other"
                assets={otherLegalAssets}
                allAssets={assets}
                onChange={onChange}
                verification={
                  verificationFor("pan") ||
                  verificationFor("fssai") ||
                  verificationFor("shop_establishment") ||
                  verificationFor("professional_registration") ||
                  verificationFor("other")
                }
              />
            </div>

            {legacyLegalAssets.length ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #fde68a",
                  background: "#fffbeb",
                  color: "#92400e",
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                {legacyLegalAssets.length} earlier legal-proof file(s) are
                preserved for compatibility. New documents should be added in
                the correct registration card above.
              </div>
            ) : null}
          </div>
        </div>

        <div id="sec-gallery" style={{ scrollMarginTop: 190 }}>
          <UniversalMediaUploader
            module="vendor"
            folder={`vendor/practical-proof/${Date.now()}`}
            value={practicalAssets}
            onChange={(next) =>
              onChange(replaceCategory(assets, "practical-proof", next))
            }
            label="2. Physical Business Proof — Mandatory"
            helperText="Add one to five clear photos of your shop, office, warehouse, factory, equipment, stock, signboard or active workplace."
            allowImages
            allowVideos={false}
            allowDocuments={false}
            maxFiles={5}
          />
        </div>

        <div id="sec-selfie" style={{ scrollMarginTop: 190 }}>
          <UniversalMediaUploader
            module="vendor"
            folder={`vendor/live-selfie/${Date.now()}`}
            value={selfieAssets}
            onChange={(next) =>
              onChange(replaceCategory(assets, "live-selfie", next))
            }
            label="3. Live Business-Board Selfie — Mandatory"
            helperText="Stand in front of your business signboard, office, shop or workplace. Make sure both your face and the declared business name are visible. Gallery upload is disabled."
            allowImages
            allowVideos={false}
            allowDocuments={false}
            cameraFacing="user"
            cameraOnly
            cameraButtonLabel="🤳 Take Live Business Selfie"
            maxFiles={1}
          />
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            Legal-document consistency check
          </div>

          <p
            style={{
              marginTop: 0,
              color: "#475569",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            AI compares the entered registration information with the uploaded
            legal certificates. This assists review but does not replace
            official or exceptional manual verification.
          </p>

          <button
            type="button"
            disabled={disabled || documentVerifyLoading || !legalComplete}
            onClick={onRunDocumentVerification}
            style={{
              width: "100%",
              padding: 11,
              borderRadius: 10,
              border: 0,
              background:
                disabled || documentVerifyLoading || !legalComplete
                  ? "#cbd5e1"
                  : "#111827",
              color: "#fff",
              fontWeight: 900,
              cursor:
                disabled || documentVerifyLoading || !legalComplete
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {documentVerifyLoading
              ? "Checking legal documents..."
              : "Check Legal Business Proof"}
          </button>

          {documentVerification ? (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 10,
                background:
                  documentVerification.status === "verified_by_ai"
                    ? "#f0fdf4"
                    : "#fff7ed",
                border:
                  documentVerification.status === "verified_by_ai"
                    ? "1px solid #bbf7d0"
                    : "1px solid #fed7aa",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              <b>
                Status:{" "}
                {String(documentVerification.status || "needs review")
                  .replace(/_/g, " ")
                  .replace("by ai", "")}
              </b>

              {documentVerification.summary ? (
                <div style={{ marginTop: 5 }}>
                  {documentVerification.summary}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
