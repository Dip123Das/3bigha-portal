import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { createMetadata } from "@/lib/seo/metadata";
import { isSeoTestContent } from "@/lib/seo/url-policy";
import RentalDetailClient, {
  type RentalPublicRow,
} from "./RentalDetailClient";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PUBLIC_RENTAL_COLUMNS = [
  "id",
  "title",
  "description",
  "pricing_unit",
  "rate",
  "rate_unit_label",
  "security_deposit",
  "country",
  "state",
  "district",
  "city",
  "locality",
  "status",
  "updated_at",
  "photos",
  "latitude",
  "longitude",
].join(",");

function validRentalId(value: string) {
  return UUID_RE.test(String(value || "").trim());
}

function getPublicSupabase() {
  const cookieStore = cookies();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return null;
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

async function getPublicRental(
  id: string
): Promise<RentalPublicRow | null> {
  const supabase = getPublicSupabase();

  if (!supabase) {
    return null;
  }

  const result = await supabase
    .from("rental_listings_public")
    .select(PUBLIC_RENTAL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (result.error || !result.data) {
    return null;
  }

  const publicRow =
    result.data as unknown as RentalPublicRow;

  let vendorUserId: string | null = null;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceKey && supabaseUrl) {
    const administrativeClient = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const ownerResult = await administrativeClient
      .from("rental_listings")
      .select("vendor_user_id")
      .eq("id", id)
      .maybeSingle();

    if (
      !ownerResult.error &&
      ownerResult.data?.vendor_user_id
    ) {
      vendorUserId = String(
        ownerResult.data.vendor_user_id
      );
    }
  }

  return {
    ...publicRow,
    vendor_user_id: vendorUserId,
  };
}

function text(value: unknown) {
  return String(value || "").trim();
}

function firstPhoto(photos: unknown) {
  if (!photos) return null;

  if (Array.isArray(photos)) {
    for (const photo of photos) {
      if (typeof photo === "string" && photo.trim()) {
        return photo.trim();
      }

      if (photo && typeof photo === "object") {
        const candidate =
          (photo as Record<string, unknown>).url ||
          (photo as Record<string, unknown>).src;

        if (
          typeof candidate === "string" &&
          candidate.trim()
        ) {
          return candidate.trim();
        }
      }
    }
  }

  if (typeof photos === "object") {
    const candidate =
      (photos as Record<string, unknown>).url ||
      (photos as Record<string, unknown>).src;

    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = decodeURIComponent(params.id || "");

  if (!validRentalId(id)) {
    notFound();
  }

  const row = await getPublicRental(id);

  if (!row) {
    notFound();
  }

  const title =
    text(row.title) || "Rental Listing";

  const location = [
    row.locality,
    row.city,
    row.district,
    row.state,
  ]
    .map(text)
    .filter(Boolean)
    .join(", ");

  const description =
    text(row.description).slice(0, 155) ||
    [
      `Explore ${title} for rent on 3bigha.com.`,
      location ? `Available in ${location}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

  return createMetadata({
    title,
    description,
    path: `/rentals/${encodeURIComponent(id)}`,
    image:
      firstPhoto(row.photos) ||
      "/og-image-new.jpg",
    noIndex: isSeoTestContent(
      row as unknown as Record<string, unknown>
    ),
    keywords: [
      title,
      "rental listing",
      "equipment rental",
      "machinery rental",
      "property rental",
      location,
      "3bigha rentals",
    ].filter(Boolean),
  });
}

export default async function RentalPublicDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id || "");

  if (!validRentalId(id)) {
    notFound();
  }

  const row = await getPublicRental(id);

  if (!row) {
    notFound();
  }

  return (
    <RentalDetailClient
      id={id}
      initialRow={row}
    />
  );
}
