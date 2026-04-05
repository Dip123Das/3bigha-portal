import { Suspense } from "react";
import RegisterRolePageClient from "./RegisterRolePageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function RegisterRolePage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "40px 20px" }}>
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 16,
              padding: 24,
              background: "white",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>
              Complete Your Registration
            </div>
            <div style={{ opacity: 0.8 }}>Loading registration form…</div>
          </div>
        </main>
      }
    >
      <RegisterRolePageClient />
    </Suspense>
  );
}