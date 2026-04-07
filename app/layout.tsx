// app/layout.tsx
import "./globals.css";
import "./ui-kit.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

// ✅ confirmed existing files (from your terminal output)
import AuthButtons from "./_components/AuthButtons";
import ActiveLink from "./_components/ActiveLink";
import GlobalUnreadBadge from "./_components/GlobalUnreadBadge";
import PresenceHeartbeat from "./_components/PresenceHeartbeat";
import MobileMenuAutoClose from "./_components/MobileMenuAutoClose";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.3bigha.com"),
  title: "3Bigha.com – Real Estate & Construction Ecosystem",
  description:
    "Buy, sell and rent property, discover building materials, services, rentals and compare quotations on 3Bigha.com.",

  openGraph: {
    title: "3Bigha.com – Property, Materials, Services & Rentals",
    description:
      "A real estate and construction ecosystem to browse listings, submit requirements and receive competitive quotes.",
    url: "https://www.3bigha.com",
    siteName: "3Bigha.com",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://www.3bigha.com/og-image-new.jpg",
        width: 1200,
        height: 630,
        alt: "3Bigha.com – Real Estate, Materials, Services, Rentals & Investment",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "3Bigha.com – Real Estate & Construction Ecosystem",
    description:
      "Browse property, materials, services and rentals. Submit requirements and get competitive quotes.",
    images: ["https://www.3bigha.com/og-image-new.jpg"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PresenceHeartbeat currentPage="global" />
        <MobileMenuAutoClose />
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
            <nav className="topNav" aria-label="Primary navigation">
              <ActiveLink className="topNavLink" href="/" exact>
                Home
              </ActiveLink>

              <ActiveLink className="topNavLink" href="/property">
                Property
              </ActiveLink>
              <ActiveLink className="topNavLink" href="/materials">
                Materials
              </ActiveLink>
              <ActiveLink className="topNavLink" href="/services">
                Services
              </ActiveLink>
              <ActiveLink className="topNavLink" href="/rentals">
                Rentals
              </ActiveLink>
              <ActiveLink className="topNavLink" href="/investment">
                Investment
              </ActiveLink>
              <ActiveLink className="topNavLink" href="/blog">
                Blog / News
              </ActiveLink>
            </nav>

            {/* Search menu (submits to /search) */}
            <details className="searchMenu">
              <summary className="searchMenuBtn">Search</summary>

              <div className="searchPanel" role="dialog" aria-label="Smart search">
                <div className="searchPanelHeader">
                  <div className="searchPanelTitle">Smart Search</div>
                  <div className="searchPanelSubtitle">
                    Unified search page with filters, Near me and Voice (inside /search).
                  </div>
                </div>

                <form action="/search" method="get">
                  <div className="searchRow">
                    <select className="searchSelect" name="scope" defaultValue="all" aria-label="Search scope">
                      <option value="all">All</option>
                      <option value="property">Property</option>
                      <option value="materials">Materials</option>
                      <option value="services">Services</option>
                      <option value="rentals">Rentals</option>
                      <option value="blog">Blog / News</option>
                    </select>

                    <input className="searchInput" name="q" placeholder="Search listings, materials, services…" />

                    <input className="searchMini" name="city" placeholder="City" />
                    <input className="searchMini" name="locality" placeholder="Locality" />
                    <input className="searchMini" name="min" placeholder="Min ₹" />
                    <input className="searchMini" name="max" placeholder="Max ₹" />

                    <button className="searchBtnPrimary" type="submit">
                      Search
                    </button>
                  </div>

                  {/* Near me + Voice */}
                  <div className="searchRowSecondary" aria-label="Quick actions">
                    <Link className="searchPill searchPillStrong" href="/search?near=1">
                      📍 Near me
                    </Link>
                    <Link className="searchPill searchPillStrong" href="/search?voice=1">
                      🎙️ Voice search
                    </Link>
                    <Link className="searchPill" href="/search">
                      Open full search →
                    </Link>
                  </div>

                  <div className="searchNote">
                    Near me + Voice search are available inside the unified search page:{" "}
                    <Link className="postMenuInlineLink" href="/search">
                      /search →
                    </Link>
                  </div>
                </form>
              </div>
            </details>

            {/* Actions */}
            <div className="topActions">
              {/* Post/List mega menu */}
              <details className="postMenu">
                <summary className="topBtn topBtnPrimary">
                  Post / List <span className="postMenuCaret">▾</span>
                </summary>

                <div className="postMenuPanel" role="dialog" aria-label="Post or List">
                  <div className="postMenuHeader">
                    <div className="postMenuTitle">Post / List on 3Bigha</div>
                    <div className="postMenuSubtitle">
                      Choose what you want to list. Each section has its own dedicated workflow.
                    </div>
                  </div>

                  <div className="postMenuGrid">
                    <div className="postCard">
                      <div className="postCardIcon">🏠</div>
                      <div>
                        <div className="postCardTitle">Property</div>
                        <div className="postCardDesc">Individual property listing (sell / rent / lease).</div>
                        <div className="postCardActions">
                          <Link className="postCardBtn postCardBtnPrimary" href="/property/add">
                            Post Property →
                          </Link>
                          <Link className="postCardBtn" href="/property/builder/projects">
                            Builder Projects →
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="postCard">
                      <div className="postCardIcon">🧱</div>
                      <div>
                        <div className="postCardTitle">Materials</div>
                        <div className="postCardDesc">List building materials for buyers &amp; contractors.</div>
                        <div className="postCardActions">
                          <Link className="postCardBtn postCardBtnPrimary" href="/materials/add">
                            List Material →
                          </Link>
                          <Link className="postCardBtn" href="/materials/my">
                            My Materials →
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="postCard">
                      <div className="postCardIcon">🛠️</div>
                      <div>
                        <div className="postCardTitle">Services</div>
                        <div className="postCardDesc">Legal, professional &amp; technical services listing.</div>
                        <div className="postCardActions">
                          <Link className="postCardBtn postCardBtnPrimary" href="/services/add">
                            List Service →
                          </Link>
                          <Link className="postCardBtn" href="/services/my">
                            My Services →
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="postCard">
                      <div className="postCardIcon">🚜</div>
                      <div>
                        <div className="postCardTitle">Rentals</div>
                        <div className="postCardDesc">Equipment &amp; services available on rent.</div>
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
                      <div className="postCardIcon">📰</div>
                      <div>
                        <div className="postCardTitle">Blog / News</div>
                        <div className="postCardDesc">Post updates, guides, announcements &amp; news.</div>
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
                  </div>

                  <div className="postMenuFooter">
                    <div className="postMenuFootNote">
                      New vendor? Start with{" "}
                      <Link className="postMenuInlineLink" href="/login?returnTo=%2Fvendor">
                        Login →
                      </Link>
                    </div>
                  </div>
                </div>
              </details>

              {/* Keep your existing vendor dashboard shortcut */}
              <GlobalUnreadBadge
                className="topBtn topBtnGhost"
                href="/vendor"
                label="My Dashboard"
                variant="topBtn"
                title="Open dashboard with unread chat count"
              />

              {/* ✅ Intelligent Login/Logout */}
              <AuthButtons />
            </div>

            {/* Mobile menu */}
            <details className="topMobileMenu">
              <summary className="topHamburger" aria-label="Open menu">
                <span />
                <span />
                <span />
              </summary>

              <div className="topMobilePanel">
                <div className="topMobileGroup">
                  <div className="topMobileTitle">Browse</div>

                  <ActiveLink className="topMobileLink" href="/" exact>
                    Home
                  </ActiveLink>

                  <ActiveLink className="topMobileLink" href="/property">
                    Property
                  </ActiveLink>
                  <ActiveLink className="topMobileLink" href="/materials">
                    Materials
                  </ActiveLink>
                  <ActiveLink className="topMobileLink" href="/services">
                    Services
                  </ActiveLink>
                  <ActiveLink className="topMobileLink" href="/rentals">
                    Rentals
                  </ActiveLink>
                  <ActiveLink className="topMobileLink" href="/investment">
                    Investment
                  </ActiveLink>
                  <ActiveLink className="topMobileLink" href="/blog">
                    Blog / News
                  </ActiveLink>
                  <ActiveLink className="topMobileLink" href="/search">
                    Search
                  </ActiveLink>
                </div>

                <div className="topMobileGroup">
                  <div className="topMobileTitle">Buyer</div>
                  <ActiveLink className="topMobileLink" href="/dashboard/buyer">
                    My Dashboard
                  </ActiveLink>
                  <ActiveLink className="topMobileLink" href="/dashboard/buyer/rfqs">
                    My RFQs / Compare Quotes
                  </ActiveLink>
                  <GlobalUnreadBadge
                    className="topMobileLink"
                    href="/dashboard/inbox-v2"
                    label="Unified Inbox"
                    variant="subLink"
                    title="Open unified inbox with unread chat count"
                  />
                  <ActiveLink className="topMobileLink" href="/rfq/general/new">
                    Submit Requirement
                  </ActiveLink>
                </div>

                <div className="topMobileGroup">
                  <div className="topMobileTitle">Investment</div>

                  <ActiveLink
                    className="topMobileLink"
                    href="/dashboard/investor/deal-rooms"
                  >
                    Investor Deal Rooms
                  </ActiveLink>

                  <ActiveLink
                    className="topMobileLink"
                    href="/dashboard/builder/deal-rooms"
                  >
                    Builder Deal Rooms
                  </ActiveLink>
                </div>

                <div className="topMobileGroup">
                  <div className="topMobileTitle">Vendor</div>
                  <GlobalUnreadBadge
                    className="topMobileLink"
                    href="/vendor/inbox-v2"
                    label="Vendor Inbox"
                    variant="subLink"
                    title="Open vendor inbox with unread chat count"
                  />
                  <ActiveLink className="topMobileLink" href="/vendor">
                    My Dashboard
                  </ActiveLink>

                  <Link className="topMobileLink" href="/login">
                    Login / Account
                  </Link>
                </div>
              </div>
            </details>
          </div>

          {/* SUB BAR */}
          <div className="topSubBar">
            <div className="topSubBarInner">
              <div className="topHint">Browse verified listings • Compare quotes • Contact vendors • Track enquiries</div>

              <div className="topSubLinks">
                {/* ✅ ONE SIMPLE MY DASHBOARD MENU (single entry, not scattered) */}
                <details className="rfqToggle">
                  <summary className="rfqToggleBtn">
                    🧑‍💼 My Dashboard <span className="rfqToggleCaret">▾</span>
                  </summary>

                  <div className="rfqTogglePanel" role="dialog" aria-label="My Dashboard menu">
                    <div className="rfqToggleTitle">My Dashboard</div>

                    <div className="rfqToggleDesc">
                      Everything you need in one place: submit requirements, track vendor responses, compare quotes, and
                      continue messages.
                    </div>

                    <div className="rfqToggleActions" style={{ display: "grid", gap: 8 }}>
                      <Link className="rfqTogglePrimary" href="/rfq/general/new">
                        ✍️ Submit Requirement →
                      </Link>

                      <Link className="rfqToggleSecondary" href="/dashboard/buyer/rfqs">
                        📄 My RFQs (View vendor responses + Compare quotes) →
                      </Link>

                      <Link className="rfqToggleSecondary" href="/dashboard/inbox-v2">
                        📥 Unified Inbox (All Chats) →
                      </Link>

                      <GlobalUnreadBadge
                        className="rfqToggleSecondary"
                        href="/dashboard/buyer/inbox"
                        label="💬 My Enquiries (Messages) →"
                        variant="subLink"
                        title="Open buyer inbox with unread chat count"
                      />

                      <Link className="rfqToggleSecondary" href="/dashboard/buyer">
                        🧾 My Home →
                      </Link>
                    </div>
                  </div>
                </details>

                <details className="rfqToggle">
                  <summary className="rfqToggleBtn">
                    💼 Investment <span className="rfqToggleCaret">▾</span>
                  </summary>

                  <div className="rfqTogglePanel" role="dialog" aria-label="Investment menu">
                    <div className="rfqToggleTitle">Investment Hub</div>

                    <div className="rfqToggleDesc">
                      Manage investment conversations and deal execution from one place.
                      Open investor or builder deal rooms and continue document-sharing,
                      stage tracking, and protected discussions.
                    </div>

                    <div className="rfqToggleActions" style={{ display: "grid", gap: 8 }}>
                      <Link
                        className="rfqTogglePrimary"
                        href="/dashboard/investor/deal-rooms"
                      >
                        🤝 Investor Deal Rooms →
                      </Link>

                      <Link
                        className="rfqToggleSecondary"
                        href="/dashboard/builder/deal-rooms"
                      >
                        🏗️ Builder Deal Rooms →
                      </Link>
                    </div>
                  </div>
                </details>

                {/* Submit Requirement dropdown (keep your existing structure) */}
                <details className="rfqToggle">
                  <summary className="rfqToggleBtn">
                    ✍️ Submit Requirement <span className="rfqToggleCaret">▾</span>
                  </summary>

                  <div className="rfqTogglePanel" role="dialog" aria-label="Submit Requirement menu">
                    <div className="rfqToggleTitle">Submit Requirement</div>

                    <div className="rfqToggleDesc">
                      Submit your requirement for <b>Materials, Property, Services</b> or <b>Rentals</b>. Upload a PDF /
                      handwritten list or type items. Nearby vendors will send competitive quotations.
                    </div>

                    <div className="rfqToggleActions" style={{ display: "grid", gap: 8 }}>
                      <Link className="rfqTogglePrimary" href="/rfq/general/new">
                        Start RFQ (Property / Materials / Services / Rentals) →
                      </Link>

                      <GlobalUnreadBadge
                        className="rfqToggleSecondary"
                        href="/vendor/inbox-v2"
                        label="Vendor Inbox →"
                        variant="subLink"
                        title="Open vendor inbox with unread chat count"
                      />
                    </div>
                  </div>
                </details>

                <GlobalUnreadBadge
                  className="topSubLink"
                  href="/dashboard/inbox-v2"
                  label="Unified Inbox"
                  variant="subLink"
                  title="Open unified inbox with unread chat count"
                />

                <Link className="topSubLink" href="/investment">
                  Investment
                </Link>

                {/* ✅ Keep Vendor Inbox as a direct link */}
                <GlobalUnreadBadge
                  className="topSubLink"
                  href="/vendor/inbox-v2"
                  label="Vendor Inbox"
                  variant="subLink"
                  title="Open vendor inbox with unread chat count"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="container pageBody">{children}</main>

        <footer className="siteFooter">
          <div className="footerInner">
            <div>
              © <span suppressHydrationWarning>{new Date().getFullYear()}</span> 3Bigha.com
            </div>
            <div>Built for scale • Plain CSS • Next.js App Router</div>
          </div>
        </footer>
      </body>
    </html>
  );
}