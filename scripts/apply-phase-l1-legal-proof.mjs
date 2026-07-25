#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, "utf8");
}

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;

  if (count !== 1) {
    throw new Error(
      `${label}: expected exactly 1 match, found ${count}`
    );
  }

  return source.replace(before, after);
}

function updateVerificationPanel() {
  const rel =
    "components/onboarding/BusinessVerificationPanel.tsx";

  let source = read(rel);

  source = replaceOnce(
    source,
    `type LegalProofKind = "gst" | "trade-license" | "udyam" | "other";`,
    `type LegalProofKind = "gst" | "trade-license" | "udyam" | "other";

type LegalProofMeta = {
  documentType: LegalProofKind;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  validUntil: string;
  noExpiry: boolean;
};

function readLegalProofMeta(
  asset: UploadedMediaAsset | undefined
): LegalProofMeta | null {
  const raw = (asset as any)?.legalProofMeta;

  if (!raw || typeof raw !== "object") {
    return null;
  }

  return {
    documentType: raw.documentType,
    certificateNumber: String(
      raw.certificateNumber || ""
    ),
    issuingAuthority: String(
      raw.issuingAuthority || ""
    ),
    issueDate: String(raw.issueDate || ""),
    validUntil: String(raw.validUntil || ""),
    noExpiry: Boolean(raw.noExpiry),
  };
}

function certificateIsExpired(validUntil: string) {
  if (!validUntil) return false;

  const expiry = new Date(
    \`\${validUntil}T23:59:59\`
  );

  return (
    Number.isFinite(expiry.getTime()) &&
    expiry.getTime() < Date.now()
  );
}

function legalAssetIsComplete(
  asset: UploadedMediaAsset
) {
  const meta = readLegalProofMeta(asset);

  if (!meta) return false;

  const certificateNumber =
    meta.certificateNumber.trim();
  const issuingAuthority =
    meta.issuingAuthority.trim();
  const issueDate = meta.issueDate.trim();
  const validUntil = meta.validUntil.trim();

  return Boolean(
    certificateNumber &&
      issuingAuthority &&
      issueDate &&
      (meta.noExpiry || validUntil) &&
      (
        meta.noExpiry ||
        !certificateIsExpired(validUntil)
      )
  );
}`,
    "Insert legal-proof metadata model"
  );

  source = replaceOnce(
    source,
    `  const certificateNumberReady =
    certificateNumber.trim().length > 0;
  return (`,
    `  const existingMeta =
    readLegalProofMeta(assets[0]);

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
    const latestMeta =
      readLegalProofMeta(assets[0]);

    if (!latestMeta) return;

    setIssuingAuthority(
      latestMeta.issuingAuthority
    );
    setIssueDate(
      latestMeta.issueDate
    );
    setValidUntil(
      latestMeta.validUntil
    );
    setNoExpiry(
      latestMeta.noExpiry
    );
  }, [assets]);

  const certificateNumberReady =
    certificateNumber.trim().length > 0;

  const issuingAuthorityReady =
    issuingAuthority.trim().length > 0;

  const issueDateReady =
    issueDate.trim().length > 0;

  const validityReady =
    noExpiry ||
    validUntil.trim().length > 0;

  const expired =
    !noExpiry &&
    certificateIsExpired(validUntil);

  const structuredDetailsReady =
    certificateNumberReady &&
    issuingAuthorityReady &&
    issueDateReady &&
    validityReady &&
    !expired;

  function attachLegalMetadata(
    nextAssets: UploadedMediaAsset[]
  ) {
    const legalProofMeta: LegalProofMeta = {
      documentType: kind,
      certificateNumber:
        certificateNumber.trim(),
      issuingAuthority:
        issuingAuthority.trim(),
      issueDate,
      validUntil:
        noExpiry ? "" : validUntil,
      noExpiry,
    };

    return nextAssets.map((asset) => ({
      ...asset,
      legalProofMeta,
    })) as UploadedMediaAsset[];
  }

  return (`,
    "Add structured proof state"
  );

  source = replaceOnce(
    source,
    `      {certificateNumberReady ? (
        <UniversalMediaUploader`,
    `      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 10,
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 6,
            fontSize: 13,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          Issuing Authority *

          <input
            value={issuingAuthority}
            onChange={(event) =>
              setIssuingAuthority(
                event.target.value
              )
            }
            placeholder="Example: Municipality, GST Department, Ministry of MSME"
            style={{
              width: "100%",
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
            display: "grid",
            gap: 6,
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
            onChange={(event) =>
              setIssueDate(
                event.target.value
              )
            }
            style={{
              width: "100%",
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
            display: "grid",
            gap: 6,
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
            onChange={(event) =>
              setValidUntil(
                event.target.value
              )
            }
            style={{
              width: "100%",
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
          marginTop: 10,
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
          }}
          style={{
            width: 17,
            height: 17,
          }}
        />

        This certificate has no expiry date
      </label>

      {expired ? (
        <div
          style={{
            marginTop: 10,
            padding: "10px 11px",
            borderRadius: 10,
            border:
              "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 13,
            lineHeight: 1.55,
            fontWeight: 900,
          }}
        >
          Certificate expired on{" "}
          {validUntil}. Upload a renewed
          certificate to continue.
        </div>
      ) : null}

      {structuredDetailsReady ? (
        <UniversalMediaUploader`,
    "Insert authority and validity fields"
  );

  source = replaceOnce(
    source,
    `                kind,
                next
              )`,
    `                kind,
                attachLegalMetadata(next)
              )`,
    "Attach legal metadata to certificate"
  );

  source = replaceOnce(
    source,
    `          Enter the certificate number first.
          The matching PDF upload will then open.`,
    `          Complete the certificate number,
          issuing authority, issue date and
          validity information first. The
          matching PDF upload will then open.`,
    "Update upload guidance"
  );

  source = replaceOnce(
    source,
    `              Upload only the documents that apply to your business. At least
              one valid registration proof is required. Each number entered in
              Business Identity must have its corresponding certificate here.`,
    `              Upload only the documents that apply to your business. At least
              one current legal-business document is mandatory. Enter its
              certificate number, issuing authority, issue date and valid-until
              date, or select No expiry. AI will compare those entered details
              with the matching uploaded certificate.`,
    "Update legal-proof introduction"
  );

  source = replaceOnce(
    source,
    `  const legalComplete = legalAssets.length > 0;`,
    `  const legalComplete =
    legalAssets.some(
      legalAssetIsComplete
    );`,
    "Replace document-only completion rule"
  );

  write(rel, source);
}

function updateOnboardingPage() {
  const rel =
    "app/onboarding/business/BusinessOnboardingPageClient.tsx";

  let source = read(rel);

  source = replaceOnce(
    source,
    `                    kind,
                  };`,
    `                    kind,
                    legalProofMeta:
                      x?.legalProofMeta ??
                      null,
                  } as UploadedMediaAsset;`,
    "Restore legal metadata"
  );

  source = replaceOnce(
    source,
    `        kind: asset.kind,
      })),`,
    `        kind: asset.kind,
        legalProofMeta:
          (asset as any)
            .legalProofMeta ??
          null,
      })),`,
    "Persist legal metadata"
  );

  source = replaceOnce(
    source,
    `  const legalProofReady =
    isPureBlogOnly ||
    Boolean(
      legalProofAssets.length > 0 &&
        (
          String(bp.gstin || "").trim() ||
          String(bp.trade_license_no || "").trim()
        )
    );`,
    `  const legalProofReady =
    isPureBlogOnly ||
    legalProofAssets.some((asset) => {
      const meta =
        (asset as any)
          .legalProofMeta || {};

      const certificateNumber =
        String(
          meta.certificateNumber || ""
        ).trim();

      const issuingAuthority =
        String(
          meta.issuingAuthority || ""
        ).trim();

      const issueDate =
        String(
          meta.issueDate || ""
        ).trim();

      const validUntil =
        String(
          meta.validUntil || ""
        ).trim();

      const noExpiry =
        Boolean(meta.noExpiry);

      const expiry =
        validUntil
          ? new Date(
              \`\${validUntil}T23:59:59\`
            )
          : null;

      const expired =
        !noExpiry &&
        expiry &&
        Number.isFinite(
          expiry.getTime()
        ) &&
        expiry.getTime() <
          Date.now();

      return Boolean(
        certificateNumber &&
          issuingAuthority &&
          issueDate &&
          (
            noExpiry ||
            validUntil
          ) &&
          !expired
      );
    });`,
    "Use structured legal readiness"
  );

  source = replaceOnce(
    source,
    `      label: "Upload legal business proof matching your registration number",`,
    `      label: "Upload at least one current legal-business certificate with its number, issuing authority, issue date and validity",`,
    "Update legal-proof readiness label"
  );

  write(rel, source);
}

try {
  updateVerificationPanel();
  updateOnboardingPage();

  console.log(
    "Phase L-1 applied successfully."
  );
  console.log(
    "Run npm run build before committing."
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
}
