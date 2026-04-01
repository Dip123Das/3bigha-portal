import { Suspense } from "react";
import PostLoginPageClient from "./PostLoginPageClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function PostLoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "40px 20px" }}>
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 16,
              padding: 20,
              background: "white",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
              Signing you in
            </div>
            <div style={{ opacity: 0.8 }}>Preparing your access…</div>
          </div>
        </main>
      }
    >
      <PostLoginPageClient />
    </Suspense>
  );
}