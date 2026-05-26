// components/layout/TopHeaderClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import LanguageSwitcher from "@/components/language/LanguageSwitcher";
import GlobalOperationalAwarenessBar from "@/components/operational-events/GlobalOperationalAwarenessBar";

type NavItem = { label: string; href: string; match: string };

const MAIN_NAV: NavItem[] = [
  { label: "Property", href: "/property", match: "/property" },
  { label: "Materials", href: "/materials", match: "/materials" },
  { label: "Services", href: "/services", match: "/services" },
  { label: "Rentals", href: "/rentals", match: "/rentals" },
  { label: "Blog", href: "/blog", match: "/blog" },
  { label: "Support", href: "/support/my", match: "/support" },
];

type SearchScope = "property" | "materials" | "services" | "rentals" | "blog";

type SupportAlertState = {
  total: number;
  open: number;
  waiting: number;
  escalated: number;
  risk: number;
  slaBreached: number;
  adminMode: boolean;
};

type NotificationRow = {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

function scopeToHref(scope: SearchScope, q: string) {
  const query = q.trim();
  if (!query) {
    if (scope === "property") return "/property";
    if (scope === "materials") return "/materials";
    if (scope === "services") return "/services";
    if (scope === "rentals") return "/rentals";
    return "/blog";
  }

  // NOTE: even if pages don't use ?q yet, it won't break anything.
  const enc = encodeURIComponent(query);
  if (scope === "property") return `/property?q=${enc}`;
  if (scope === "materials") return `/materials?q=${enc}`;
  if (scope === "services") return `/services?q=${enc}`;
  if (scope === "rentals") return `/rentals?q=${enc}`;
  return `/blog?q=${enc}`;
}

export default function TopHeaderClient() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  // Active menu highlight via html[data-path]
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-path", pathname || "/");
    } catch {}
  }, [pathname]);

  // Session-aware actions
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [dashboardHref, setDashboardHref] = useState("/dashboard");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationRows, setNotificationRows] = useState<NotificationRow[]>([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [notificationUrgent, setNotificationUrgent] = useState(0);

    const [supportAlerts, setSupportAlerts] = useState<SupportAlertState>({
    total: 0,
    open: 0,
    waiting: 0,
    escalated: 0,
    risk: 0,
    slaBreached: 0,
    adminMode: false,
  });

  async function resolveDashboardHrefForUser(userId?: string | null) {
    if (!userId) {
      setDashboardHref("/dashboard");
      return;
    }

    try {
      // MASTER / ADMIN / BUYER ROLE CHECK
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      const role = String(profile?.role || "").toLowerCase();

      // MASTER ADMIN
      if (
        role === "master_admin" ||
        role === "admin" ||
        role === "super_admin"
      ) {
        setDashboardHref("/admin/dashboard");
        return;
      }

      // BANKER
      if (
        role === "banker" ||
        role === "finance_banker"
      ) {
        setDashboardHref("/dashboard/banker");
        return;
      }

      // VENDOR / HUB VENDOR
      const { data: vendor } = await supabase
        .from("business_profiles")
        .select("id,user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (vendor || role.includes("vendor")) {
        setDashboardHref("/dashboard/vendor");
        return;
      }

      // DEFAULT BUYER / USER
      setDashboardHref("/dashboard");
    } catch {
      setDashboardHref("/dashboard");
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;
        if (error) {
          setIsAuthed(false);
          setEmail(null);
          setAuthLoading(false);
          return;
        }
        const s = data.session;
        setIsAuthed(!!s);
        setEmail(s?.user?.email ?? null);
        setAuthLoading(false);
        await resolveDashboardHrefForUser(s?.user?.id || null);
        loadSupportAlerts(s?.access_token || null);
        loadNotifications(s?.access_token || null);
      } catch {
        if (!alive) return;
        setIsAuthed(false);
        setEmail(null);
        setAuthLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      setEmail(session?.user?.email ?? null);
      setAuthLoading(false);
      void resolveDashboardHrefForUser(session?.user?.id || null);
      loadSupportAlerts(session?.access_token || null);
      loadNotifications(session?.access_token || null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

    useEffect(() => {
    if (!isAuthed) return;

    const timer = window.setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      await loadSupportAlerts(data.session?.access_token || null);
      await loadNotifications(data.session?.access_token || null);
    }, 30000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, supabase]);

    async function loadSupportAlerts(accessToken?: string | null) {
    if (!accessToken) {
      setSupportAlerts({
        total: 0,
        open: 0,
        waiting: 0,
        escalated: 0,
        risk: 0,
        slaBreached: 0,
        adminMode: false,
      });
      return;
    }

    try {
      const res = await fetch("/api/support/tickets", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) return;

      const rows = Array.isArray(json.rows) ? json.rows : [];
      const now = Date.now();

      setSupportAlerts({
        total: rows.length,
        open: rows.filter((r: any) => r.status === "open").length,
        waiting: rows.filter((r: any) => r.status === "waiting_user").length,
        escalated: rows.filter((r: any) => r.status === "escalated").length,
        risk: rows.filter((r: any) => r.ai_risk_flag && r.ai_risk_flag !== "none").length,
        slaBreached: rows.filter(
          (r: any) => r.sla_deadline && new Date(r.sla_deadline).getTime() <= now
        ).length,
        adminMode: !!json.isAdmin,
      });
    } catch {
      // Silent: header alerts should never break navigation.
    }
  }

    async function loadNotifications(accessToken?: string | null) {
    if (!accessToken) {
      setNotificationRows([]);
      setNotificationUnread(0);
      setNotificationUrgent(0);
      return;
    }

    try {
      const res = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) return;

      setNotificationRows(Array.isArray(json.rows) ? json.rows : []);
      setNotificationUnread(Number(json.unread || 0));
      setNotificationUrgent(Number(json.urgent || 0));
    } catch {
      // Silent: notification dropdown should never break header.
    }
  }

  async function markNotificationRead(notificationId: string, actionUrl?: string | null) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notificationId }),
        });

        await loadNotifications(token);
      }
    } catch {
      // Silent.
    }

    setNotificationOpen(false);

    if (actionUrl) {
      router.push(actionUrl);
    }
  }

  async function markAllNotificationsRead() {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) return;

      await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await loadNotifications(token);
    } catch {
      // Silent.
    }
  }

  async function doLogout() {
    try {
      await supabase.auth.signOut();
    } catch {}
    router.push("/");
    router.refresh();
  }

  // Global Search UI
  const [scope, setScope] = useState<SearchScope>("property");
  const [q, setQ] = useState("");

  function submitSearch() {
    const href = scopeToHref(scope, q);
    router.push(href);
  }

  return (
    <header className="topHeader">
      <GlobalOperationalAwarenessBar />
      <div className="topHeaderInner">
        {/* Brand */}
        <div className="topBrand">
          <Link className="topBrandLink" href="/">
            <div className="topBrandName">3Bigha.com</div>
            <div className="topBrandTagline">Real Estate &amp; Construction Ecosystem</div>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="topNav" aria-label="Main navigation">
          {MAIN_NAV.map((n) => (
            <Link key={n.href} className="topNavLink" href={n.href} data-match={n.match}>
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Search (desktop + tablet) */}
        <div className="topSearch" aria-label="Global search">
          <select
            className="topSearchScope"
            value={scope}
            onChange={(e) => setScope(e.target.value as SearchScope)}
            aria-label="Search category"
          >
            <option value="property">Property</option>
            <option value="materials">Materials</option>
            <option value="services">Services</option>
            <option value="rentals">Rentals</option>
            <option value="blog">Blog</option>
          </select>

          <input
            className="topSearchInput"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
            }}
          />

          <button className="topSearchBtn" type="button" onClick={submitSearch}>
            Search
          </button>
        </div>

        <div
          data-no-translate="true"
          style={{
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <LanguageSwitcher />
        </div>

        {/* Right actions */}
        <div className="topActions">

          {/* Post/List mega menu */}
          <details className="postMenu">
            <summary className="topBtn topBtnPrimary postMenuBtn">
              Post / List <span className="postMenuCaret">▾</span>
            </summary>

            <div className="postMenuPanel" role="dialog" aria-label="Post or list options">
              <div className="postMenuHeader">
                <div className="postMenuTitle">Create a Listing</div>
                <div className="postMenuSubtitle">
                  Post property (individual or builder project), list materials, services, rentals — or publish blog/news.
                </div>
              </div>

              <div className="postMenuGrid">
                <div className="postCard">
                  <div className="postCardIcon" aria-hidden="true">
                    🏠
                  </div>
                  <div>
                    <div className="postCardTitle">Property</div>
                    <div className="postCardDesc">
                      Post an individual property, or list a builder project with multiple units/options.
                    </div>
                    <div className="postCardActions">
                      <Link className="postCardBtn postCardBtnPrimary" href="/property/add">
                        Post Property (Individual) →
                      </Link>
                      <Link className="postCardBtn" href="/property/builder/projects/add">
                        List Builder Project →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="postCard">
                  <div className="postCardIcon" aria-hidden="true">
                    🧱
                  </div>
                  <div>
                    <div className="postCardTitle">Materials</div>
                    <div className="postCardDesc">
                      List building materials and variants for buyers to compare and enquire.
                    </div>
                    <div className="postCardActions">
                      <Link className="postCardBtn postCardBtnPrimary" href="/materials/add">
                        List Material →
                      </Link>
                      <Link className="postCardBtn" href="/dashboard/vendor">
                        Vendor Tools →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="postCard">
                  <div className="postCardIcon" aria-hidden="true">
                    🧑‍💼
                  </div>
                  <div>
                    <div className="postCardTitle">Services</div>
                    <div className="postCardDesc">
                      List professional, legal, technical, and skilled services with pricing and coverage area.
                    </div>
                    <div className="postCardActions">
                      <Link className="postCardBtn postCardBtnPrimary" href="/services/add">
                        List Service →
                      </Link>
                      <Link className="postCardBtn" href="/services">
                        Browse Services →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="postCard">
                  <div className="postCardIcon" aria-hidden="true">
                    🏗️
                  </div>
                  <div>
                    <div className="postCardTitle">Rentals</div>
                    <div className="postCardDesc">
                      List machines/tools/equipment for rent with rate, unit and security deposit.
                    </div>
                    <div className="postCardActions">
                      <Link className="postCardBtn postCardBtnPrimary" href="/rentals/add">
                        List Rental →
                      </Link>
                      <Link className="postCardBtn" href="/rentals/my">
                        My Rentals →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="postCard">
                  <div className="postCardIcon" aria-hidden="true">
                    📰
                  </div>
                  <div>
                    <div className="postCardTitle">Blog / News</div>
                    <div className="postCardDesc">
                      Publish guides, announcements, updates and news to build trust.
                    </div>
                    <div className="postCardActions">
                      <Link className="postCardBtn postCardBtnPrimary" href="/blog/new">
                        Write Post →
                      </Link>
                      <Link className="postCardBtn" href="/blog/my">
                        My Posts →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="postCard">
                  <div className="postCardIcon" aria-hidden="true">
                    💬
                  </div>
                  <div>
                    <div className="postCardTitle">Enquiries</div>
                    <div className="postCardDesc">Track buyer enquiries and vendor inbox conversations.</div>
                    <div className="postCardActions">
                      <Link className="postCardBtn postCardBtnPrimary" href="/dashboard/buyer/enquiries">
                        My Enquiries →
                      </Link>
                      <Link className="postCardBtn" href="/dashboard/vendor/enquiries">
                        Vendor Inbox →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="postMenuFooter">
                <div className="postMenuFootNote">
                  Tip: keep phone/email updated for faster contact.{" "}
                  <Link className="postMenuInlineLink" href="/dashboard">
                    Go to Dashboard →
                  </Link>
                </div>
              </div>
            </div>
          </details>

          {/* Auth-aware */}
          {authLoading ? (
            <span className="topBtn topBtnGhost" style={{ opacity: 0.75 }}>
              Account
            </span>
          ) : isAuthed ? (
            <>
              <div style={{ position: "relative" }}>
                <button
                  className="topBtn topBtnGhost"
                  type="button"
                  onClick={() => setNotificationOpen((v) => !v)}
                  title={
                    notificationUnread > 0
                      ? `${notificationUnread} unread notifications`
                      : "Notifications"
                  }
                  style={{
                    position: "relative",
                    border: notificationUrgent > 0 ? "1px solid #dc2626" : undefined,
                  }}
                >
                  🔔
                  {notificationUnread > 0 ? (
                    <span
                      style={{
                        marginLeft: 6,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 12,
                        background: notificationUrgent > 0 ? "#dc2626" : "#2563eb",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 950,
                        padding: "0 6px",
                      }}
                    >
                      {notificationUnread}
                    </span>
                  ) : null}
                </button>

                {notificationOpen ? (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: 260,
                      maxWidth: "88vw",
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      boxShadow: "0 18px 45px rgba(15,23,42,0.18)",
                      zIndex: 80,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontWeight: 950, color: "#0f172a" }}>
                        Notifications
                      </div>

                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#2563eb",
                          fontWeight: 900,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Mark all read
                      </button>
                    </div>

                    <div style={{ maxHeight: 360, overflowY: "auto" }}>
                      {notificationRows.length === 0 ? (
                        <div style={{ padding: 14, color: "#64748b", fontWeight: 850 }}>
                          No notifications yet.
                        </div>
                      ) : (
                        notificationRows.slice(0, 10).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => markNotificationRead(n.id, n.action_url)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              border: "none",
                              borderBottom: "1px solid #f1f5f9",
                              background: n.is_read ? "#fff" : "#eff6ff",
                              padding: 12,
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                                alignItems: "flex-start",
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 950, color: "#0f172a" }}>
                                {n.title}
                              </div>
                              {!n.is_read ? (
                                <span
                                  style={{
                                    borderRadius: 12,
                                    padding: "2px 7px",
                                    fontSize: 10,
                                    fontWeight: 950,
                                    color: "#fff",
                                    background:
                                      ["high", "urgent", "critical"].includes(String(n.priority))
                                        ? "#dc2626"
                                        : "#2563eb",
                                  }}
                                >
                                  {String(n.priority || "new").toUpperCase()}
                                </span>
                              ) : null}
                            </div>

                            <div
                              style={{
                                marginTop: 5,
                                fontSize: 12,
                                color: "#475569",
                                fontWeight: 800,
                                lineHeight: 1.45,
                              }}
                            >
                              {n.message}
                            </div>

                            <div
                              style={{
                                marginTop: 5,
                                fontSize: 11,
                                color: "#94a3b8",
                                fontWeight: 800,
                              }}
                            >
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <Link className="topBtn topBtnGhost" href={dashboardHref} title={email ?? ""}>
                Dashboard
              </Link>
              <Link
                className="topBtn topBtnGhost"
                href={supportAlerts.adminMode ? "/admin/dashboard/support" : "/support/my"}
                title={
                  supportAlerts.adminMode
                    ? `Open: ${supportAlerts.open}, Escalated: ${supportAlerts.escalated}, Risk: ${supportAlerts.risk}`
                    : `Support tickets: ${supportAlerts.total}`
                }
              >
                Support
                {(supportAlerts.adminMode
                  ? supportAlerts.open + supportAlerts.waiting + supportAlerts.escalated + supportAlerts.risk + supportAlerts.slaBreached
                  : supportAlerts.open + supportAlerts.waiting) > 0 ? (
                  <span
                    style={{
                      marginLeft: 6,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 12,
                      background: supportAlerts.escalated || supportAlerts.risk || supportAlerts.slaBreached ? "#dc2626" : "#2563eb",
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 950,
                      padding: "0 6px",
                    }}
                  >
                    {supportAlerts.adminMode
                      ? supportAlerts.open + supportAlerts.waiting + supportAlerts.escalated + supportAlerts.risk + supportAlerts.slaBreached
                      : supportAlerts.open + supportAlerts.waiting}
                  </span>
                ) : null}
              </Link>
              <button className="topBtn topBtnGhost" type="button" onClick={doLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link className="topBtn topBtnGhost" href="/login">
              Login
            </Link>
          )}

          {/* Mobile menu */}
          <details className="topMobileMenu">
            <summary className="topHamburger" aria-label="Open menu">
              <span />
              <span />
              <span />
            </summary>

            <div className="topMobilePanel">
              <div className="topMobileGroup">
                <div className="topMobileTitle">Search</div>

                <div className="topMobileSearchRow">
                  <select
                    className="topMobileSelect"
                    value={scope}
                    onChange={(e) => setScope(e.target.value as SearchScope)}
                  >
                    <option value="property">Property</option>
                    <option value="materials">Materials</option>
                    <option value="services">Services</option>
                    <option value="rentals">Rentals</option>
                    <option value="blog">Blog</option>
                  </select>

                  <input
                    className="topMobileInput"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitSearch();
                    }}
                  />
                </div>

                <button className="topMobileBtn" type="button" onClick={submitSearch}>
                  Search
                </button>
              </div>

              <div className="topMobileGroup">
                <div className="topMobileTitle">Language</div>
                <LanguageSwitcher />
              </div>

              <div className="topMobileGroup">
                <div className="topMobileTitle">Browse</div>
                {MAIN_NAV.map((n) => (
                  <Link key={n.href} className="topMobileLink" href={n.href}>
                    {n.label}
                  </Link>
                ))}
              </div>

              <div className="topMobileGroup">
                <div className="topMobileTitle">Account</div>
                <Link className="topMobileLink" href={dashboardHref}>
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="topMobileLink"
                  onClick={() => setNotificationOpen((v) => !v)}
                  style={{
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  Notifications{notificationUnread > 0 ? ` (${notificationUnread})` : ""}
                </button>
                <Link className="topMobileLink" href="/support/my">
                  Support
                </Link>
                <Link className="topMobileLink" href="/login">
                  Login
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div className="topSubBar">
        <div className="topSubBarInner">
          <div className="topHint">Browse verified listings • Compare rates • Contact vendors • Track enquiries</div>
          <div className="topSubLinks">
            <Link className="topSubLink" href="/dashboard/buyer/enquiries">
              My Enquiries
            </Link>
            <Link className="topSubLink" href="/dashboard/vendor/enquiries">
              Vendor Inbox
            </Link>
            <Link
              className="topSubLink"
              href={supportAlerts.adminMode ? "/admin/dashboard/support" : "/support/my"}
            >
              Support
              {(supportAlerts.adminMode
                ? supportAlerts.open + supportAlerts.waiting + supportAlerts.escalated + supportAlerts.risk + supportAlerts.slaBreached
                : supportAlerts.open + supportAlerts.waiting) > 0
                ? ` (${supportAlerts.adminMode
                    ? supportAlerts.open + supportAlerts.waiting + supportAlerts.escalated + supportAlerts.risk + supportAlerts.slaBreached
                    : supportAlerts.open + supportAlerts.waiting})`
                : ""}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
