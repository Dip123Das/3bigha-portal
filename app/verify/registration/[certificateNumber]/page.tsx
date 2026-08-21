import { notFound } from "next/navigation";

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function displayDate(value: unknown) {
  const date = new Date(String(value || ""));

  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "long",
      }).format(date)
    : "Unavailable";
}

export default async function PublicRegistrationVerificationPage({
  params,
}: {
  params: {
    certificateNumber: string;
  };
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    notFound();
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const certificateNumber = decodeURIComponent(
    params.certificateNumber
  )
    .trim()
    .toUpperCase();

  const { data, error } = await supabase
    .from("registration_verification_certificates")
    .select(
      "certificate_number,verified_at,issued_at,issuer,holder_name,business_name,status"
    )
    .eq("certificate_number", certificateNumber)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 720,
          padding: 28,
          border: "1px solid #bbf7d0",
          borderRadius: 16,
          background: "#f0fdf4",
        }}
      >
        <div
          style={{
            color: "#166534",
            fontWeight: 950,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Valid 3Bigha Verification
        </div>

        <h1 style={{ marginBottom: 8 }}>
          Registration certificate confirmed
        </h1>

        <p style={{ color: "#475569" }}>
          This page confirms that the certificate is
          active in the 3Bigha verification register.
        </p>

        <dl
          style={{
            display: "grid",
            gap: 12,
            marginTop: 22,
          }}
        >
          <div>
            <dt>Verified registration</dt>
            <dd style={{ fontWeight: 950 }}>
              {data.business_name ||
                data.holder_name ||
                "Verified 3Bigha Member"}
            </dd>
          </div>
          <div>
            <dt>Verification ID</dt>
            <dd style={{ fontWeight: 950 }}>
              {data.certificate_number}
            </dd>
          </div>
          <div>
            <dt>Verified on</dt>
            <dd>{displayDate(data.verified_at)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd style={{ color: "#166534", fontWeight: 950 }}>
              ACTIVE
            </dd>
          </div>
        </dl>

        <p
          style={{
            marginTop: 22,
            color: "#64748b",
            fontSize: 13,
          }}
        >
          This confirmation is limited to 3Bigha
          registration verification. It is not a
          government licence or financial guarantee.
        </p>
      </section>
    </main>
  );
}
