"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function AwaitingApprovalPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <main style={{ padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: 24,
          background: "white",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
          ⏳ Account Under Review
        </div>

        <div style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>
          Your registration has been submitted successfully.
          <br />
          Our team is reviewing your request.
          <br />
          You will be able to access your dashboard after approval.
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#f8fafc",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}