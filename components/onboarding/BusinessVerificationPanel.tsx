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

function belongsTo(asset: UploadedMediaAsset, category: string) {
  return String(asset.path || "").includes(`/${category}/`);
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
      {complete ? "✓ Completed" : "Required"} — {children}
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
  const legalAssets = assets.filter((asset) =>
    belongsTo(asset, "legal-proof")
  );

  const practicalAssets = assets.filter((asset) =>
    belongsTo(asset, "practical-proof")
  );

  const selfieAssets = assets.filter((asset) =>
    belongsTo(asset, "live-selfie")
  );

  const legalComplete = legalAssets.length > 0;
  const practicalComplete = practicalAssets.length > 0;
  const selfieComplete = selfieAssets.length > 0;

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

      <p
        style={{
          margin: "0 0 14px",
          color: "#475569",
          lineHeight: 1.6,
        }}
      >
        Legal proof confirms registration. Practical proof shows the real
        workplace or business activity. A live selfie confirms that the person
        completing this profile is present.
      </p>

      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <RequirementStatus complete={legalComplete}>
          Legal Business Proof
        </RequirementStatus>

        <RequirementStatus complete={practicalComplete}>
          Practical Business Proof
        </RequirementStatus>

        <RequirementStatus complete={selfieComplete}>
          Live Selfie
        </RequirementStatus>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div id="sec-legal-proof" style={{ scrollMarginTop: 190 }}>
          <UniversalMediaUploader
            module="vendor"
            folder={`vendor/legal-proof/${Date.now()}`}
            value={legalAssets}
            onChange={(next) =>
              onChange(replaceCategory(assets, "legal-proof", next))
            }
            label="1. Legal Business Proof — Mandatory"
            helperText="Upload GST certificate, Trade Licence, UDYAM, registration certificate or another accepted legal business document."
            allowImages
            allowDocuments
            allowVideos={false}
            maxFiles={5}
          />
        </div>

        <div id="sec-gallery" style={{ scrollMarginTop: 190 }}>
          <UniversalMediaUploader
            module="vendor"
            folder={`vendor/practical-proof/${Date.now()}`}
            value={practicalAssets}
            onChange={(next) =>
              onChange(replaceCategory(assets, "practical-proof", next))
            }
            label="2. Practical Business Proof — Mandatory"
            helperText="Take or upload a clear photo of your shop, office, warehouse, factory, equipment, signboard or active workplace."
            allowImages
            allowVideos
            allowDocuments={false}
            maxFiles={8}
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
            label="3. Live Selfie — Mandatory"
            helperText="Use the front camera now. Gallery upload is disabled for this verification."
            allowImages
            allowVideos={false}
            allowDocuments={false}
            cameraFacing="user"
            cameraOnly
            cameraButtonLabel="🤳 Take Live Selfie"
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
            AI may compare the typed GSTIN or Trade Licence number with the
            legal proof. This assists review but does not replace official or
            manual verification.
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
              ? "Checking legal document..."
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
