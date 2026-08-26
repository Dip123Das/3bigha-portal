import {
  buildTrustedPublicationContext,
  TRUSTED_PUBLICATION_POLICY,
} from "@/lib/media/trusted-publication-gate";

type TrustedBadgeModule =
  | "property"
  | "builder_project"
  | "materials"
  | "rentals"
  | "services";

type Props = {
  media: unknown;
  module: TrustedBadgeModule;
  compact?: boolean;
};

function extractAssets(
  media: unknown,
): unknown[] {
  if (Array.isArray(media)) {
    return media;
  }

  if (
    !media ||
    typeof media !== "object"
  ) {
    return [];
  }

  const record =
    media as Record<string, unknown>;

  const candidates = [
    record.media_assets,
    record.media,
    record.assets,
    record.items,
    record.photos,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export default function TrustedListingMediaBadge({
  media,
  module,
  compact = false,
}: Props) {
  const assets = extractAssets(media);

  const context =
    buildTrustedPublicationContext(
      assets as any[],
    );

  const required =
    TRUSTED_PUBLICATION_POLICY[module]
      .requiredCaptures;

  const verified =
    context.completedCaptures >= required &&
    context.gpsVerified === true &&
    context.provenanceVerified === true &&
    context.captureSessionCompleted === true;

  if (!verified) {
    return null;
  }

  return (
    <span
      title="This listing includes mandatory live-camera evidence with verified GPS, capture provenance and a completed capture session."
      aria-label="Trusted live GPS media verified"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        width: "fit-content",
        borderRadius: 999,
        border:
          "1px solid rgba(22, 101, 52, 0.24)",
        background: "#f0fdf4",
        color: "#166534",
        padding: compact
          ? "4px 8px"
          : "6px 10px",
        fontSize: compact ? 11 : 12,
        fontWeight: 900,
        lineHeight: 1.2,
      }}
    >
      <span aria-hidden="true">✓</span>
      {compact
        ? "Trusted Media"
        : "Live GPS Media Verified"}
    </span>
  );
}
