"use client";

import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";

type Props = {
  originalName: string;
  originalNameWarningAccepted: boolean;
  onOriginalNameWarningAcceptedChange: (value: boolean) => void;

  selfieAssets: UploadedMediaAsset[];
  onSelfieAssetsChange: (assets: UploadedMediaAsset[]) => void;

  workPhotoOneAssets: UploadedMediaAsset[];
  onWorkPhotoOneAssetsChange: (assets: UploadedMediaAsset[]) => void;

  workPhotoTwoAssets: UploadedMediaAsset[];
  onWorkPhotoTwoAssetsChange: (assets: UploadedMediaAsset[]) => void;

  identityDocumentType: string;
  onIdentityDocumentTypeChange: (value: string) => void;

  identityDocumentMaskedReference: string;
  onIdentityDocumentMaskedReferenceChange: (value: string) => void;

  identityDocumentConsentAccepted: boolean;
  onIdentityDocumentConsentAcceptedChange: (value: boolean) => void;

  primarySkillLabel: string;
};

function isTrustedLiveCameraAsset(
  asset: UploadedMediaAsset
) {
  return (
    asset.captureSource === "live_camera" &&
    Boolean(asset.captureTimestamp) &&
    asset.preparedBeforeUpload === true
  );
}

export default function IndividualProfessionalVerificationSection({
  originalName,
  originalNameWarningAccepted,
  onOriginalNameWarningAcceptedChange,
  selfieAssets,
  onSelfieAssetsChange,
  workPhotoOneAssets,
  onWorkPhotoOneAssetsChange,
  workPhotoTwoAssets,
  onWorkPhotoTwoAssetsChange,
  identityDocumentType,
  onIdentityDocumentTypeChange,
  identityDocumentMaskedReference,
  onIdentityDocumentMaskedReferenceChange,
  identityDocumentConsentAccepted,
  onIdentityDocumentConsentAcceptedChange,
  primarySkillLabel,
}: Props) {
  const selfieComplete =
    selfieAssets.length === 1 &&
    selfieAssets.every(isTrustedLiveCameraAsset);

  const firstWorkPhotoComplete =
    workPhotoOneAssets.length === 1 &&
    workPhotoOneAssets.every(isTrustedLiveCameraAsset);

  const secondWorkPhotoComplete =
    workPhotoTwoAssets.length === 1 &&
    workPhotoTwoAssets.every(isTrustedLiveCameraAsset);

  const workEvidenceComplete =
    firstWorkPhotoComplete &&
    secondWorkPhotoComplete;

  return (
    <>
      <section style={sectionStyle}>
        <div style={eyebrowStyle}>
          Original identity declaration
        </div>

        <h2 style={headingStyle}>
          Confirm your original name
        </h2>

        <div style={nameBoxStyle}>
          {originalName || "Original name not entered"}
        </div>

        <label style={declarationStyle}>
          <input
            type="checkbox"
            checked={originalNameWarningAccepted}
            onChange={(event) =>
              onOriginalNameWarningAcceptedChange(
                event.target.checked
              )
            }
            style={{ marginTop: 3 }}
          />

          <span>
            I confirm that this is my complete original name.
            I understand that deliberate use of another
            person’s name or a false identity may lead to
            suspension after human review. Genuine spelling,
            transliteration or document-reading differences
            can be corrected.
          </span>
        </label>
      </section>

      <section style={sectionStyle}>
        <div style={eyebrowStyle}>
          Verified profile photograph
        </div>

        <h2 style={headingStyle}>
          Take your verified live selfie
        </h2>

        <p style={helperStyle}>
          This live selfie is mandatory and becomes your only
          profile photograph across 3Bigha. Gallery upload is
          disabled. Keep your full face visible and remove
          sunglasses or face coverings.
        </p>

        <UniversalMediaUploader
          module="vendor"
          value={selfieAssets}
          onChange={onSelfieAssetsChange}
          folder="individual-professionals/selfie"
          label="Verified Live Selfie"
          helperText="Use the front camera. Keep your complete face clearly visible."
          allowImages
          allowVideos={false}
          allowDocuments={false}
          cameraFacing="user"
          cameraOnly
          inlineCamera
          cameraGuide="face"
          requirePreparation
          outputPreset="square_1080"
          cameraButtonLabel="📷 Start Verified Live Selfie"
          assetMetadata={{
            evidenceCategory: "verified_selfie",
            evidencePurpose:
              "individual_professional_identity",
          }}
          maxFiles={1}
        />

        <StatusLine
          complete={selfieComplete}
          completeText="Verified live selfie captured."
          incompleteText="A verified live-camera selfie is required."
        />
      </section>

      <section style={sectionStyle}>
        <div style={eyebrowStyle}>
          Live skill evidence
        </div>

        <h2 style={headingStyle}>
          Show that you personally perform this work
        </h2>

        <p style={helperStyle}>
          Two live-camera photographs are mandatory. Ordinary
          gallery upload is disabled. The photographs should
          reasonably match your declared skill:
          {" "}
          <strong>
            {primarySkillLabel || "your selected skill"}
          </strong>.
        </p>

        <div style={twoColumnStyle}>
          <div style={proofCardStyle}>
            <strong>
              1. Show yourself performing the skill
            </strong>

            <p style={smallTextStyle}>
              Capture yourself personally doing or clearly
              demonstrating the declared work. Keep the work,
              tools and surroundings visible.
            </p>

            <UniversalMediaUploader
              module="vendor"
              value={workPhotoOneAssets}
              onChange={onWorkPhotoOneAssetsChange}
              folder="individual-professionals/work-evidence-one"
              label="Live Work Photo 1"
              helperText="Take a current photo showing you personally performing or demonstrating the work."
              allowImages
              allowVideos={false}
              allowDocuments={false}
              cameraFacing="environment"
              cameraOnly
              inlineCamera
              requirePreparation
              outputPreset="square_1080"
              cameraButtonLabel="📷 Take First Live Work Photo"
              assetMetadata={{
                evidenceCategory:
                  "professional_performing_skill",
                evidencePurpose:
                  "individual_professional_work",
              }}
              maxFiles={1}
            />

            <StatusLine
              complete={firstWorkPhotoComplete}
              completeText="First live work photo captured."
              incompleteText="First live work photo required."
            />
          </div>

          <div style={proofCardStyle}>
            <strong>
              2. Show tools, materials or completed work
            </strong>

            <p style={smallTextStyle}>
              Capture the real tools, materials, workplace or
              completed work associated with your declared
              skill.
            </p>

            <UniversalMediaUploader
              module="vendor"
              value={workPhotoTwoAssets}
              onChange={onWorkPhotoTwoAssetsChange}
              folder="individual-professionals/work-evidence-two"
              label="Live Work Photo 2"
              helperText="Take a current photo of real tools, materials, workplace or completed work."
              allowImages
              allowVideos={false}
              allowDocuments={false}
              cameraFacing="environment"
              cameraOnly
              inlineCamera
              requirePreparation
              outputPreset="square_1080"
              cameraButtonLabel="📷 Take Second Live Work Photo"
              assetMetadata={{
                evidenceCategory:
                  "professional_tools_or_completed_work",
                evidencePurpose:
                  "individual_professional_work",
              }}
              maxFiles={1}
            />

            <StatusLine
              complete={secondWorkPhotoComplete}
              completeText="Second live work photo captured."
              incompleteText="Second live work photo required."
            />
          </div>
        </div>

        <StatusLine
          complete={workEvidenceComplete}
          completeText="Both mandatory live work photographs are complete."
          incompleteText="Both live-camera work photographs are required before submission."
        />
      </section>

      <section style={optionalSectionStyle}>
        <div style={eyebrowStyle}>
          Optional identity document
        </div>

        <h2 style={headingStyle}>
          Add an identity reference
        </h2>

        <p style={helperStyle}>
          Aadhaar is not compulsory. You may provide a masked
          Aadhaar reference or another accepted government
          identity reference.{" "}
          {"Do not enter a complete unmasked Aadhaar number."}
        </p>

        <label style={labelStyle}>
          Document type
          <select
            value={identityDocumentType}
            onChange={(event) =>
              onIdentityDocumentTypeChange(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="">
              No document provided
            </option>
            <option value="masked_aadhaar">
              Masked Aadhaar
            </option>
            <option value="voter_id">
              Voter ID
            </option>
            <option value="driving_licence">
              Driving Licence
            </option>
            <option value="passport">
              Passport
            </option>
            <option value="mgnrega_job_card">
              MGNREGA Job Card
            </option>
            <option value="government_skill_card">
              Government Skill / Worker Card
            </option>
            <option value="other_government_photo_id">
              Other Government Photo ID
            </option>
          </select>
        </label>

        {identityDocumentType ? (
          <>
            <label style={labelStyle}>
              Masked reference or last four characters
              <input
                value={identityDocumentMaskedReference}
                onChange={(event) =>
                  onIdentityDocumentMaskedReferenceChange(
                    event.target.value
                  )
                }
                placeholder="Example: XXXX-XXXX-1234"
                style={inputStyle}
              />
            </label>

            <label style={declarationStyle}>
              <input
                type="checkbox"
                checked={identityDocumentConsentAccepted}
                onChange={(event) =>
                  onIdentityDocumentConsentAcceptedChange(
                    event.target.checked
                  )
                }
                style={{ marginTop: 3 }}
              />

              <span>
                I voluntarily provide this masked identity
                reference for identity review. I understand
                why it is collected and that it will not be
                displayed publicly.
              </span>
            </label>
          </>
        ) : null}
      </section>
    </>
  );
}

function StatusLine({
  complete,
  completeText,
  incompleteText,
}: {
  complete: boolean;
  completeText: string;
  incompleteText: string;
}) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "9px 11px",
        borderRadius: 10,
        border: complete
          ? "1px solid #86efac"
          : "1px solid #fdba74",
        background: complete
          ? "#f0fdf4"
          : "#fff7ed",
        color: complete
          ? "#166534"
          : "#9a3412",
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      {complete
        ? `✓ ${completeText}`
        : `Required: ${incompleteText}`}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  border: "1px solid #dbeafe",
  borderRadius: 16,
  background: "#f8fbff",
};

const optionalSectionStyle: React.CSSProperties = {
  ...sectionStyle,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#1d4ed8",
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: ".07em",
  textTransform: "uppercase",
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const helperStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.55,
  fontSize: 14,
};

const smallTextStyle: React.CSSProperties = {
  margin: "7px 0 10px",
  color: "#64748b",
  lineHeight: 1.5,
  fontSize: 13,
};

const nameBoxStyle: React.CSSProperties = {
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  fontWeight: 900,
};

const declarationStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: 12,
  borderRadius: 11,
  border: "1px solid #bfdbfe",
  background: "white",
  lineHeight: 1.5,
};

const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(280px,1fr))",
  gap: 12,
};

const proofCardStyle: React.CSSProperties = {
  minWidth: 0,
  padding: 12,
  borderRadius: 13,
  border: "1px solid #dbe4ef",
  background: "white",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
};
