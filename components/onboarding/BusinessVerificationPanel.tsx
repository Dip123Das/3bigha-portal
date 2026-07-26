"use client";

import { useEffect, useState } from "react";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";

type Props = {
  assets: UploadedMediaAsset[];
  onChange: (assets: UploadedMediaAsset[]) => void;
  disabled?: boolean;
  documentVerification?: any;
  documentVerifyLoading?: boolean;
  onRunDocumentVerification: () => void;
  registrationNumbers: {
    gstin: string;
    tradeLicenseNo: string;
    udyamNo: string;
    otherRegistrationNo: string;
  };
  onRegistrationNumberChange: (
    key:
      | "gstin"
      | "tradeLicenseNo"
      | "udyamNo"
      | "otherRegistrationNo",
    value: string
  ) => void;
};

type LegalProofKind = "gst" | "trade-license" | "udyam" | "other";

type LegalProofMeta = {
  documentType: LegalProofKind;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  validUntil: string;
  noExpiry: boolean;
};

function getLegalProofMeta(
  asset: UploadedMediaAsset | undefined
): LegalProofMeta | null {
  const value = (asset as any)?.legalProofMeta;

  if (!value || typeof value !== "object") {
    return null;
  }

  return {
    documentType: String(
      value.documentType || ""
    ) as LegalProofKind,
    certificateNumber: String(
      value.certificateNumber || ""
    ),
    issuingAuthority: String(
      value.issuingAuthority || ""
    ),
    issueDate: String(
      value.issueDate || ""
    ),
    validUntil: String(
      value.validUntil || ""
    ),
    noExpiry: Boolean(value.noExpiry),
  };
}

function dateAtEndOfDay(value: string) {
  if (!value) return null;

  const parsed = new Date(
    `${value}T23:59:59`
  );

  return Number.isFinite(parsed.getTime())
    ? parsed
    : null;
}

function isExpiredLegalProof(
  validUntil: string,
  noExpiry: boolean
) {
  if (noExpiry) return false;

  const expiry = dateAtEndOfDay(validUntil);

  return Boolean(
    expiry &&
      expiry.getTime() < Date.now()
  );
}

function isFutureIssueDate(issueDate: string) {
  if (!issueDate) return false;

  const issue = new Date(
    `${issueDate}T00:00:00`
  );

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return Boolean(
    Number.isFinite(issue.getTime()) &&
      issue.getTime() > today.getTime()
  );
}

function validityPrecedesIssueDate(
  issueDate: string,
  validUntil: string,
  noExpiry: boolean
) {
  if (
    noExpiry ||
    !issueDate ||
    !validUntil
  ) {
    return false;
  }

  const issue = new Date(
    `${issueDate}T00:00:00`
  );

  const expiry = new Date(
    `${validUntil}T23:59:59`
  );

  return Boolean(
    Number.isFinite(issue.getTime()) &&
      Number.isFinite(expiry.getTime()) &&
      expiry.getTime() < issue.getTime()
  );
}

function legalProofAssetIsComplete(
  asset: UploadedMediaAsset
) {
  const meta = getLegalProofMeta(asset);

  if (!meta) return false;

  return Boolean(
    meta.certificateNumber.trim() &&
      meta.issuingAuthority.trim() &&
      meta.issueDate &&
      (
        meta.noExpiry ||
        meta.validUntil
      ) &&
      !isFutureIssueDate(
        meta.issueDate
      ) &&
      !validityPrecedesIssueDate(
        meta.issueDate,
        meta.validUntil,
        meta.noExpiry
      ) &&
      !isExpiredLegalProof(
        meta.validUntil,
        meta.noExpiry
      )
  );
}

type PhysicalProofKind =
  | "signboard"
  | "frontage"
  | "workplace"
  | "machinery"
  | "stock"
  | "activity"
  | "warehouse"
  | "factory"
  | "other";

function belongsTo(asset: UploadedMediaAsset, category: string) {
  return String(asset.path || "").includes(`/${category}/`);
}

function belongsToLegalKind(asset: UploadedMediaAsset, kind: LegalProofKind) {
  return String(asset.path || "").includes(`/legal-proof/${kind}/`);
}

function belongsToPhysicalKind(
  asset: UploadedMediaAsset,
  kind: PhysicalProofKind
) {
  return String(asset.path || "").includes(`/practical-proof/${kind}/`);
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

function replacePhysicalKind(
  allAssets: UploadedMediaAsset[],
  kind: PhysicalProofKind,
  nextKindAssets: UploadedMediaAsset[]
) {
  return [
    ...allAssets.filter((asset) => !belongsToPhysicalKind(asset, kind)),
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
  certificateNumber,
  certificateNumberLabel,
  onCertificateNumberChange,
}: {
  title: string;
  description: string;
  kind: LegalProofKind;
  assets: UploadedMediaAsset[];
  allAssets: UploadedMediaAsset[];
  onChange: (assets: UploadedMediaAsset[]) => void;
  verification?: any;
  certificateNumber: string;
  certificateNumberLabel: string;
  onCertificateNumberChange: (
    value: string
  ) => void;
}) {
  const existingMeta =
    getLegalProofMeta(assets[0]);

  const [
    issuingAuthority,
    setIssuingAuthority,
  ] = useState(
    existingMeta?.issuingAuthority || ""
  );

  const [
    issueDate,
    setIssueDate,
  ] = useState(
    existingMeta?.issueDate || ""
  );

  const [
    validUntil,
    setValidUntil,
  ] = useState(
    existingMeta?.validUntil || ""
  );

  const [
    noExpiry,
    setNoExpiry,
  ] = useState(
    Boolean(existingMeta?.noExpiry)
  );

  useEffect(() => {
    const latest =
      getLegalProofMeta(assets[0]);

    if (!latest) return;

    setIssuingAuthority(
      latest.issuingAuthority
    );
    setIssueDate(
      latest.issueDate
    );
    setValidUntil(
      latest.validUntil
    );
    setNoExpiry(
      latest.noExpiry
    );
  }, [assets]);

  function buildMeta(
    overrides: Partial<LegalProofMeta> = {}
  ): LegalProofMeta {
    return {
      documentType: kind,
      certificateNumber:
        certificateNumber.trim(),
      issuingAuthority:
        issuingAuthority.trim(),
      issueDate,
      validUntil:
        noExpiry ? "" : validUntil,
      noExpiry,
      ...overrides,
    };
  }

  function persistExistingAssets(
    meta: LegalProofMeta
  ) {
    if (assets.length === 0) return;

    const nextAssets = assets.map(
      (asset) =>
        ({
          ...asset,
          legalProofMeta: meta,
        }) as UploadedMediaAsset
    );

    onChange(
      replaceLegalKind(
        allAssets,
        kind,
        nextAssets
      )
    );
  }

  function attachMetadata(
    nextAssets: UploadedMediaAsset[]
  ) {
    const meta = buildMeta();

    return nextAssets.map(
      (asset) =>
        ({
          ...asset,
          legalProofMeta: meta,
        }) as UploadedMediaAsset
    );
  }

  const certificateNumberReady =
    certificateNumber.trim().length > 0;

  const issuingAuthorityReady =
    issuingAuthority.trim().length > 0;

  const issueDateReady =
    issueDate.length > 0;

  const validityReady =
    noExpiry ||
    validUntil.length > 0;

  const futureIssueDate =
    isFutureIssueDate(issueDate);

  const invalidDateOrder =
    validityPrecedesIssueDate(
      issueDate,
      validUntil,
      noExpiry
    );

  const expired =
    isExpiredLegalProof(
      validUntil,
      noExpiry
    );

  const structuredDetailsReady =
    certificateNumberReady &&
    issuingAuthorityReady &&
    issueDateReady &&
    validityReady &&
    !futureIssueDate &&
    !invalidDateOrder &&
    !expired;

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid #dbeafe",
        background: "#fff",
      }}
    >
      <div
        style={{
          fontWeight: 950,
          color: "#0f172a",
        }}
      >
        {title}
      </div>

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
              verification.status ===
              "verified_by_ai"
                ? "#f0fdf4"
                : verification.status ===
                    "document_mismatch" ||
                  verification.status ===
                    "format_invalid"
                ? "#fef2f2"
                : "#fff7ed",
            border:
              verification.status ===
              "verified_by_ai"
                ? "1px solid #bbf7d0"
                : verification.status ===
                    "document_mismatch" ||
                  verification.status ===
                    "format_invalid"
                ? "1px solid #fecaca"
                : "1px solid #fed7aa",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <b>
            {String(
              verification.status ||
                "needs_manual_review"
            ).replace(/_/g, " ")}
          </b>

          {verification.summary ? (
            <div style={{ marginTop: 3 }}>
              {verification.summary}
            </div>
          ) : null}
        </div>
      ) : null}

      <label
        style={{
          display: "block",
          marginTop: 12,
          fontSize: 13,
          fontWeight: 900,
          color: "#0f172a",
        }}
      >
        {certificateNumberLabel} *

        <input
          value={certificateNumber}
          onChange={(event) => {
            const value =
              event.target.value;

            onCertificateNumberChange(
              value
            );

            persistExistingAssets(
              buildMeta({
                certificateNumber:
                  value.trim(),
              })
            );
          }}
          placeholder={`Enter ${certificateNumberLabel}`}
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 11px",
            borderRadius: 10,
            border:
              "1px solid #cbd5e1",
            background: "#ffffff",
            fontWeight: 750,
          }}
        />
      </label>

      <label
        style={{
          display: "block",
          marginTop: 12,
          fontSize: 13,
          fontWeight: 900,
          color: "#0f172a",
        }}
      >
        Issuing Authority *

        <input
          value={issuingAuthority}
          onChange={(event) => {
            const value =
              event.target.value;

            setIssuingAuthority(value);

            persistExistingAssets(
              buildMeta({
                issuingAuthority:
                  value.trim(),
              })
            );
          }}
          placeholder="Example: Municipality, GST Department or Ministry of MSME"
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 11px",
            borderRadius: 10,
            border:
              "1px solid #cbd5e1",
            background: "#ffffff",
            fontWeight: 750,
          }}
        />
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          marginTop: 12,
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          Issue Date *

          <input
            type="date"
            value={issueDate}
            max={new Date()
              .toISOString()
              .slice(0, 10)}
            onChange={(event) => {
              const value =
                event.target.value;

              setIssueDate(value);

              persistExistingAssets(
                buildMeta({
                  issueDate: value,
                })
              );
            }}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 11px",
              borderRadius: 10,
              border:
                "1px solid #cbd5e1",
              background: "#ffffff",
              fontWeight: 750,
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          Valid Until
          {noExpiry ? "" : " *"}

          <input
            type="date"
            value={validUntil}
            min={issueDate || undefined}
            disabled={noExpiry}
            onChange={(event) => {
              const value =
                event.target.value;

              setValidUntil(value);

              persistExistingAssets(
                buildMeta({
                  validUntil: value,
                  noExpiry: false,
                })
              );
            }}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "10px 11px",
              borderRadius: 10,
              border:
                "1px solid #cbd5e1",
              background:
                noExpiry
                  ? "#f1f5f9"
                  : "#ffffff",
              fontWeight: 750,
            }}
          />
        </label>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 11,
          fontSize: 13,
          fontWeight: 850,
          color: "#334155",
        }}
      >
        <input
          type="checkbox"
          checked={noExpiry}
          onChange={(event) => {
            const checked =
              event.target.checked;

            setNoExpiry(checked);

            if (checked) {
              setValidUntil("");
            }

            persistExistingAssets(
              buildMeta({
                noExpiry: checked,
                validUntil: checked
                  ? ""
                  : validUntil,
              })
            );
          }}
          style={{
            width: 17,
            height: 17,
          }}
        />

        This certificate has no expiry date
      </label>

      {futureIssueDate ? (
        <div
          style={{
            marginTop: 10,
            padding: "9px 10px",
            borderRadius: 10,
            border:
              "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 12,
            fontWeight: 850,
          }}
        >
          The issue date cannot be in
          the future.
        </div>
      ) : null}

      {invalidDateOrder ? (
        <div
          style={{
            marginTop: 10,
            padding: "9px 10px",
            borderRadius: 10,
            border:
              "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 12,
            fontWeight: 850,
          }}
        >
          The validity date cannot be
          earlier than the issue date.
        </div>
      ) : null}

      {expired ? (
        <div
          style={{
            marginTop: 10,
            padding: "9px 10px",
            borderRadius: 10,
            border:
              "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 12,
            fontWeight: 850,
          }}
        >
          This certificate expired on{" "}
          {validUntil}. Please provide
          the renewed certificate.
        </div>
      ) : null}

      {structuredDetailsReady ? (
        <UniversalMediaUploader
          module="vendor"
          folder={`vendor/legal-proof/${kind}/${Date.now()}`}
          value={assets}
          onChange={(next) =>
            onChange(
              replaceLegalKind(
                allAssets,
                kind,
                attachMetadata(next)
              )
            )
          }
          label={`${title} PDF`}
          helperText="Upload the certificate matching the number, authority, issue date and validity entered above."
          allowImages={false}
          allowVideos={false}
          allowDocuments
          maxFiles={1}
        />
      ) : (
        <div
          style={{
            marginTop: 10,
            padding: "9px 10px",
            borderRadius: 10,
            border:
              "1px solid #fed7aa",
            background: "#fff7ed",
            color: "#9a3412",
            fontSize: 12,
            fontWeight: 850,
            lineHeight: 1.5,
          }}
        >
          Complete the certificate
          number, issuing authority,
          issue date and validity
          information first. The matching
          PDF upload will then open.
        </div>
      )}
    </div>
  );
}

function PhysicalProofCard({
  title,
  description,
  kind,
  assets,
  allAssets,
  onChange,
  totalPhysicalAssets,
}: {
  title: string;
  description: string;
  kind: PhysicalProofKind;
  assets: UploadedMediaAsset[];
  allAssets: UploadedMediaAsset[];
  onChange: (assets: UploadedMediaAsset[]) => void;
  totalPhysicalAssets: number;
}) {
  const slotAvailable = assets.length > 0 || totalPhysicalAssets < 5;

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: assets.length
          ? "1px solid #86efac"
          : "1px solid #e2e8f0",
        background: assets.length ? "#f0fdf4" : "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div>
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
        </div>

        <div
          style={{
            flexShrink: 0,
            padding: "5px 8px",
            borderRadius: 999,
            background: assets.length ? "#dcfce7" : "#f1f5f9",
            color: assets.length ? "#166534" : "#475569",
            fontSize: 11,
            fontWeight: 900,
          }}
        >
          {assets.length ? "Added" : "Choose one"}
        </div>
      </div>

      <UniversalMediaUploader
        module="vendor"
        folder={`vendor/practical-proof/${kind}/${Date.now()}`}
        value={assets}
        onChange={(next) =>
          onChange(replacePhysicalKind(allAssets, kind, next))
        }
        label={`${title} photo`}
        helperText={
          slotAvailable
            ? "Use a clear, recent photo taken at the real business location."
            : "Five physical-proof photos have already been added. Remove one to use this category."
        }
        allowImages
        allowVideos={false}
        allowDocuments={false}
        cameraFacing="environment"
        maxFiles={slotAvailable ? 1 : 0}
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
  registrationNumbers,
  onRegistrationNumberChange,
}: Props) {
  const [cameraAvailability, setCameraAvailability] = useState<
    "checking" | "available" | "unavailable" | "unknown"
  >("checking");
  const [handoffMessage, setHandoffMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function detectCamera() {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.enumerateDevices
      ) {
        if (!cancelled) setCameraAvailability("unavailable");
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(
          (device) => device.kind === "videoinput"
        );

        if (!cancelled) {
          setCameraAvailability(hasCamera ? "available" : "unavailable");
        }
      } catch {
        if (!cancelled) setCameraAvailability("unknown");
      }
    }

    void detectCamera();

    return () => {
      cancelled = true;
    };
  }, []);
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
  const physicalProofKinds: PhysicalProofKind[] = [
    "signboard",
    "frontage",
    "workplace",
    "machinery",
    "stock",
    "activity",
    "warehouse",
    "factory",
    "other",
  ];

  const legacyPracticalAssets = assets.filter(
    (asset) =>
      belongsTo(asset, "practical-proof") &&
      !physicalProofKinds.some((kind) =>
        belongsToPhysicalKind(asset, kind)
      )
  );

  const physicalAssetsByKind = Object.fromEntries(
    physicalProofKinds.map((kind) => [
      kind,
      assets.filter((asset) => belongsToPhysicalKind(asset, kind)),
    ])
  ) as Record<PhysicalProofKind, UploadedMediaAsset[]>;

  const structuredPracticalAssets = physicalProofKinds.flatMap(
    (kind) => physicalAssetsByKind[kind]
  );

  const practicalAssets = [
    ...structuredPracticalAssets,
    ...legacyPracticalAssets,
  ];
  const selfieAssets = assets.filter((asset) =>
    belongsTo(asset, "live-selfie")
  );

  const legalComplete =
    legalAssets.some(
      legalProofAssetIsComplete
    );
  const practicalComplete = practicalAssets.length > 0;
  const selfieComplete = selfieAssets.length > 0;

  const completedVerificationSteps = [
    legalComplete,
    practicalComplete,
    selfieComplete,
  ].filter(Boolean).length;
  const verificationProgress = Math.round(
    (completedVerificationSteps / 3) * 100
  );

  async function copyMobileContinuationLink() {
    if (typeof window === "undefined") return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      setHandoffMessage(
        "Continuation link copied. Open it on your mobile phone and sign in with the same 3Bigha account."
      );
    } catch {
      setHandoffMessage(
        "Copy the current page address from your browser and open it on your mobile phone. Then sign in with the same 3Bigha account."
      );
    }
  }

  async function shareMobileContinuationLink() {
    if (typeof window === "undefined") return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Continue 3Bigha business registration",
          text: "Open this saved 3Bigha registration on your mobile phone.",
          url: window.location.href,
        });
        setHandoffMessage(
          "Continuation link shared. Open it on your mobile phone and sign in with the same account."
        );
        return;
      } catch {
        return;
      }
    }

    await copyMobileContinuationLink();
  }

  const signboardAdded =
    physicalAssetsByKind.signboard.length > 0;
  const workplaceContextAdded =
    physicalAssetsByKind.frontage.length > 0 ||
    physicalAssetsByKind.workplace.length > 0 ||
    physicalAssetsByKind.warehouse.length > 0 ||
    physicalAssetsByKind.factory.length > 0;
  const businessActivityAdded =
    physicalAssetsByKind.machinery.length > 0 ||
    physicalAssetsByKind.stock.length > 0 ||
    physicalAssetsByKind.activity.length > 0;

  const physicalCoverageCount = [
    signboardAdded,
    workplaceContextAdded,
    businessActivityAdded,
  ].filter(Boolean).length;

  const physicalEvidenceLevel =
    practicalAssets.length === 0
      ? "Not started"
      : physicalCoverageCount === 3 && practicalAssets.length >= 3
      ? "Strong"
      : physicalCoverageCount >= 2
      ? "Good"
      : "Basic";

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
        Complete your business proof
      </h3>

      <p style={{ margin: "0 0 14px", color: "#475569", lineHeight: 1.6 }}>
        Add one legal proof, real workplace evidence and a live selfie.
        3Bigha will then show one clear business-proof status: uploaded,
        verifying, verified or needs correction.
      </p>

      <div
        style={{
          marginBottom: 14,
          padding: 14,
          borderRadius: 14,
          border: "1px solid #dbeafe",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 950, color: "#0f172a" }}>
              Evidence collection
            </div>
            <div
              style={{
                marginTop: 4,
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {completedVerificationSteps} of 3 required evidence items added
            </div>
          </div>

          <div
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background:
                verificationProgress === 100 ? "#dcfce7" : "#eff6ff",
              color:
                verificationProgress === 100 ? "#166534" : "#1e40af",
              fontSize: 12,
              fontWeight: 950,
            }}
          >
            {verificationProgress}% evidence collected
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            height: 9,
            borderRadius: 999,
            background: "#e2e8f0",
            overflow: "hidden",
          }}
          aria-label={`Evidence collection ${verificationProgress}%`}
        >
          <div
            style={{
              width: `${verificationProgress}%`,
              height: "100%",
              background:
                verificationProgress === 100 ? "#16a34a" : "#2563eb",
              transition: "width 180ms ease",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 9,
            color: "#166534",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          ✓ Uploaded evidence is saved to this registration.
          Evidence collection and business-proof verification are separate.
        </div>
      </div>

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
                certificateNumber={
                  registrationNumbers.gstin
                }
                certificateNumberLabel="GSTIN"
                onCertificateNumberChange={(value) =>
                  onRegistrationNumberChange(
                    "gstin",
                    value
                  )
                }
              />
              <LegalProofCard
                title="Trade Licence"
                description="For the Trade Licence number entered in Business Identity."
                kind="trade-license"
                assets={tradeLicenseAssets}
                allAssets={assets}
                onChange={onChange}
                verification={verificationFor("trade_license")}
                certificateNumber={
                  registrationNumbers.tradeLicenseNo
                }
                certificateNumberLabel="Trade Licence Number"
                onCertificateNumberChange={(value) =>
                  onRegistrationNumberChange(
                    "tradeLicenseNo",
                    value
                  )
                }
              />
              <LegalProofCard
                title="UDYAM Registration"
                description="For the UDYAM number entered in Business Identity."
                kind="udyam"
                assets={udyamAssets}
                allAssets={assets}
                onChange={onChange}
                verification={verificationFor("udyam")}
                certificateNumber={
                  registrationNumbers.udyamNo
                }
                certificateNumberLabel="UDYAM Registration Number"
                onCertificateNumberChange={(value) =>
                  onRegistrationNumberChange(
                    "udyamNo",
                    value
                  )
                }
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
                certificateNumber={
                  registrationNumbers.otherRegistrationNo
                }
                certificateNumberLabel="Other Registration / PAN Number"
                onCertificateNumberChange={(value) =>
                  onRegistrationNumberChange(
                    "otherRegistrationNo",
                    value
                  )
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

        <div
          style={{
            padding: 16,
            borderRadius: 16,
            border:
              cameraAvailability === "unavailable"
                ? "1px solid #fdba74"
                : "1px solid #bfdbfe",
            background:
              cameraAvailability === "unavailable"
                ? "#fff7ed"
                : "#eff6ff",
          }}
        >
          <div
            style={{
              fontWeight: 950,
              color:
                cameraAvailability === "unavailable"
                  ? "#9a3412"
                  : "#1e3a8a",
              fontSize: 16,
            }}
          >
            📱 You can complete the photo steps from your mobile phone
          </div>

          <p
            style={{
              margin: "7px 0 0",
              color: "#475569",
              fontSize: 13,
              lineHeight: 1.65,
            }}
          >
            {cameraAvailability === "unavailable"
              ? "No camera was detected on this device. No problem — you can do the rest, including capturing business photos and the live selfie, from your mobile phone."
              : "If this desktop or laptop does not have a suitable camera, you can do the rest, including capturing business photos and the live selfie, from your mobile phone."}
          </p>

          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: "#ffffff",
              border: "1px solid #dbeafe",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 850,
              lineHeight: 1.55,
            }}
          >
            ✓ The work you have completed so far is saved here. Sign in to
            3Bigha on your mobile phone with the same account and continue from
            this registration.
          </div>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => void shareMobileContinuationLink()}
              style={{
                minHeight: 44,
                border: 0,
                borderRadius: 12,
                padding: "10px 12px",
                background: "#1d4ed8",
                color: "#ffffff",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              📱 Send link to mobile
            </button>

            <button
              type="button"
              onClick={() => void copyMobileContinuationLink()}
              style={{
                minHeight: 44,
                border: "1px solid #bfdbfe",
                borderRadius: 12,
                padding: "10px 12px",
                background: "#ffffff",
                color: "#1e40af",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              🔗 Copy continuation link
            </button>
          </div>

          {handoffMessage ? (
            <div
              style={{
                marginTop: 10,
                padding: "9px 10px",
                borderRadius: 10,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: 12,
                fontWeight: 850,
                lineHeight: 1.5,
              }}
            >
              {handoffMessage}
            </div>
          ) : null}
        </div>

        <div id="sec-gallery" style={{ scrollMarginTop: 190 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 950,
                    color: "#0f172a",
                    fontSize: 16,
                  }}
                >
                  2. Physical Business Proof — Mandatory
                </div>
                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#475569",
                    fontSize: 13,
                    lineHeight: 1.6,
                    maxWidth: 760,
                  }}
                >
                  Add one to five recent photos from the real business
                  location. Choose the correct category for every photo.
                </p>
              </div>

              <div
                style={{
                  padding: "8px 11px",
                  borderRadius: 12,
                  background:
                    physicalEvidenceLevel === "Strong"
                      ? "#dcfce7"
                      : physicalEvidenceLevel === "Good"
                      ? "#dbeafe"
                      : physicalEvidenceLevel === "Basic"
                      ? "#fef3c7"
                      : "#f1f5f9",
                  color:
                    physicalEvidenceLevel === "Strong"
                      ? "#166534"
                      : physicalEvidenceLevel === "Good"
                      ? "#1e40af"
                      : physicalEvidenceLevel === "Basic"
                      ? "#92400e"
                      : "#475569",
                  fontSize: 12,
                  fontWeight: 950,
                }}
              >
                Evidence: {physicalEvidenceLevel} · {practicalAssets.length}/5
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#166534",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <b>Good evidence</b>
                <div>✓ Clear, recent and well-lit</div>
                <div>✓ Full workplace context visible</div>
                <div>✓ Business name, stock or activity visible</div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <b>Avoid</b>
                <div>✗ Blurred, dark or heavily edited images</div>
                <div>✗ Screenshots or downloaded internet images</div>
                <div>✗ Photos unrelated to the declared business</div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              <PhysicalProofCard
                title="Business Signboard"
                description="Strongest evidence. Keep the declared business name clearly readable."
                kind="signboard"
                assets={physicalAssetsByKind.signboard}
                allAssets={assets}
                onChange={onChange}
                totalPhysicalAssets={practicalAssets.length}
              />
              <PhysicalProofCard
                title="Shop or Office Front"
                description="Show the complete front entrance and surrounding location."
                kind="frontage"
                assets={physicalAssetsByKind.frontage}
                allAssets={assets}
                onChange={onChange}
                totalPhysicalAssets={practicalAssets.length}
              />
              <PhysicalProofCard
                title="Inside Workplace"
                description="Show the actual office, shop floor, counter or working area."
                kind="workplace"
                assets={physicalAssetsByKind.workplace}
                allAssets={assets}
                onChange={onChange}
                totalPhysicalAssets={practicalAssets.length}
              />
              <PhysicalProofCard
                title="Machinery or Equipment"
                description="Show tools, machines, vehicles or equipment used in the business."
                kind="machinery"
                assets={physicalAssetsByKind.machinery}
                allAssets={assets}
                onChange={onChange}
                totalPhysicalAssets={practicalAssets.length}
              />
              <PhysicalProofCard
                title="Stock or Products"
                description="Show real inventory, materials, goods or products."
                kind="stock"
                assets={physicalAssetsByKind.stock}
                allAssets={assets}
                onChange={onChange}
                totalPhysicalAssets={practicalAssets.length}
              />
              <PhysicalProofCard
                title="Business Activity"
                description="Show genuine work, production, service or customer-facing activity."
                kind="activity"
                assets={physicalAssetsByKind.activity}
                allAssets={assets}
                onChange={onChange}
                totalPhysicalAssets={practicalAssets.length}
              />
              <PhysicalProofCard
                title="Warehouse"
                description="Use where storage or distribution is part of the business."
                kind="warehouse"
                assets={physicalAssetsByKind.warehouse}
                allAssets={assets}
                onChange={onChange}
                totalPhysicalAssets={practicalAssets.length}
              />
              <PhysicalProofCard
                title="Factory or Production Unit"
                description="Show the real production environment and operating setup."
                kind="factory"
                assets={physicalAssetsByKind.factory}
                allAssets={assets}
                onChange={onChange}
                totalPhysicalAssets={practicalAssets.length}
              />
              <PhysicalProofCard
                title="Other Physical Evidence"
                description="Use only for relevant evidence that fits no other category."
                kind="other"
                assets={physicalAssetsByKind.other}
                allAssets={assets}
                onChange={onChange}
                totalPhysicalAssets={practicalAssets.length}
              />
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 7,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                background: "#fff",
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 950, color: "#0f172a" }}>
                Evidence coverage
              </div>
              <div>
                {signboardAdded ? "✓" : "○"} Business signboard
              </div>
              <div>
                {workplaceContextAdded ? "✓" : "○"} Workplace context
              </div>
              <div>
                {businessActivityAdded ? "✓" : "○"} Stock, machinery or
                business activity
              </div>
            </div>

            {legacyPracticalAssets.length ? (
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
                {legacyPracticalAssets.length} earlier physical-proof
                photo(s) are preserved. New evidence should be uploaded under
                the correct category above.
              </div>
            ) : null}
          </div>
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
            helperText="Stand at the declared business location with the signboard behind you. Keep your full face and the declared business name clearly visible. Remove sunglasses or face coverings. Take the photo now; gallery upload is disabled."
            allowImages
            allowVideos={false}
            allowDocuments={false}
            cameraFacing="user"
            cameraOnly
            inlineCamera
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
              : "Verify My Business Proof"}
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
