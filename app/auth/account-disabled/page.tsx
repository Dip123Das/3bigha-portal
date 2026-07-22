export default function AccountDisabledPage() {
  return <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
    <section style={{ maxWidth: 620, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 16, padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Account unavailable</h1>
      <p>This account has been deactivated by 3Bigha administration. Marketplace browsing remains available, but account workspaces and protected actions are unavailable.</p>
      <p>If you believe this is a mistake, contact 3Bigha support and provide your registered email or phone number.</p>
      <a href="/contact">Contact support</a>
    </section>
  </main>;
}
