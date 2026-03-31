// components/layout/TopHeaderClient.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type NavItem = { label: string; href: string; match: string };

const MAIN_NAV: NavItem[] = [
  { label: "Property", href: "/property", match: "/property" },
  { label: "Materials", href: "/materials", match: "/materials" },
  { label: "Services", href: "/services", match: "/services" },
  { label: "Rentals", href: "/rentals", match: "/rentals" },
  { label: "Blog / News", href: "/blog", match: "/blog" },
];

type SearchScope = "property" | "materials" | "services" | "rentals" | "blog";

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
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

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
            placeholder="Search city, locality, service, material, equipment…"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
            }}
          />

          <button className="topSearchBtn" type="button" onClick={submitSearch}>
            Search
          </button>
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
              <Link className="topBtn topBtnGhost" href="/dashboard" title={email ?? ""}>
                Dashboard
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
                <div className="topMobileTitle">Browse</div>
                {MAIN_NAV.map((n) => (
                  <Link key={n.href} className="topMobileLink" href={n.href}>
                    {n.label}
                  </Link>
                ))}
              </div>

              <div className="topMobileGroup">
                <div className="topMobileTitle">Account</div>
                <Link className="topMobileLink" href="/dashboard">
                  Dashboard
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
          </div>
        </div>
      </div>
    </header>
  );
}
