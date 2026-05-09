// app/layout.tsx
import "./globals.css";
import "./ui-kit.css";
import { createMetadata } from "@/lib/seo/metadata";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import ProcurementCommandPalette from "@/components/procurement/ProcurementCommandPalette";

// confirmed existing files
import AuthButtons from "./_components/AuthButtons";
import ActiveLink from "./_components/ActiveLink";
import GlobalUnreadBadge from "./_components/GlobalUnreadBadge";
import GlobalNotificationBell from "./_components/GlobalNotificationBell";
import PresenceHeartbeat from "./_components/PresenceHeartbeat";
import MobileMenuAutoClose from "./_components/MobileMenuAutoClose";
import AutoTranslatePage from "@/components/language/AutoTranslatePage";
import LanguageSwitcher from "@/components/language/LanguageSwitcher";

export const metadata = createMetadata({
  title: "AI-Powered Property, Construction, Materials, Services, Rentals & Investment Marketplace",
  description:
    "3bigha.com is an AI-powered marketplace and procurement operating system for real estate, building materials, construction services, rentals, RFQs, price prediction, vendor comparison and investment opportunities across India.",
  path: "/",
  image: "/og-image-new.jpg",
  keywords: [
    "3bigha",
    "real estate marketplace India",
    "property marketplace",
    "land for sale",
    "building materials",
    "construction services",
    "rental machinery",
    "RFQ marketplace",
    "AI procurement platform",
    "vendor comparison",
    "price prediction",
    "investment opportunities",
    "construction marketplace West Bengal",
    "property in Cooch Behar",
  ],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PresenceHeartbeat currentPage="global" />
        <MobileMenuAutoClose />
        <AutoTranslatePage />

        <header
          className="topHeader"
          style={{
            borderBottom: "1px solid rgba(15,23,42,0.10)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.9), 0 8px 24px rgba(15,23,42,0.04)",
            background: "#fff",
          }}
        >
          <Container className="topHeaderInner">
            <div
              className="topBrand"
              style={{
                minWidth: 0,
                flex: "0 1 auto",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Link
                className="topBrandLink"
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                    gap: 0,
                  textDecoration: "none",
                  minWidth: 0,
                  width: "fit-content",
                  flexWrap: "nowrap",
                }}
              >
                <div className="siteLogoFull">
                  <Image
                    src="/logo.png"
                    alt="3Bigha.com logo"
                    width={360}
                    height={120}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                    priority
                  />
                </div>
              </Link>
            </div>

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
              <ActiveLink className="topNavLink" href="/support/my">
                Support
              </ActiveLink>
              <ActiveLink className="topNavLink" href="/blog">
                Blog
              </ActiveLink>
              <ActiveLink className="topNavLink" href="/dashboard/procurement-health">
                AI Procurement OS
              </ActiveLink>
              <ProcurementCommandPalette />
            </nav>

            <form className="topSearchQuick" action="/search" method="get">
              <input
                className="topSearchInput"
                name="q"
                placeholder="Search..."
              />
              <button className="topSearchButton" type="submit">
                Search
              </button>
            </form>

            <div data-no-translate="true" className="topLanguageSelector">
              <LanguageSwitcher />
            </div>

            <div className="topActions">
              <details className="postMenu">
                <summary className="topBtn topBtnPrimary">
                  Post / List <span className="postMenuCaret">▾</span>
                </summary>

                <div className="postMenuPanel" role="dialog" aria-label="Post or List">
                  <div className="postMenuHeader">
                    <div className="postMenuTitle">Post / List on 3Bigha</div>
                    <div className="postMenuSubtitle">
                      Choose what you want to list. Each section has its own
                      dedicated workflow.
                    </div>
                  </div>

                  <div className="postMenuGrid">
                    <div className="postCard">
                      <div className="postCardIcon">🏠</div>
                      <div>
                        <div className="postCardTitle">Property</div>
                        <div className="postCardDesc">
                          Individual property listing (sell / rent / lease).
                        </div>
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
                        <div className="postCardDesc">
                          List building materials for buyers &amp; contractors.
                        </div>
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
                        <div className="postCardDesc">
                          Legal, professional &amp; technical services listing.
                        </div>
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
                        <div className="postCardDesc">
                          Equipment &amp; services available on rent.
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
                      <div className="postCardIcon">📰</div>
                      <div>
                        <div className="postCardTitle">Blog / News</div>
                        <div className="postCardDesc">
                          Post updates, guides, announcements &amp; news.
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

              <GlobalUnreadBadge
                className="topBtn topBtnGhost"
                href="/dashboard"
                label="My Dashboard"
                variant="topBtn"
                title="Open dashboard with unread chat count"
              />

              <GlobalNotificationBell
                className="topBtn topBtnGhost"
                label="Alerts"
              />

              <AuthButtons />
            </div>

            <details className="topMobileMenu">
              <summary className="topHamburger" aria-label="Open menu">
                <span />
                <span />
                <span />
              </summary>

              <div className="topMobilePanel">
                <div className="topMobileGroup" data-no-translate="true">
                  <div className="topMobileTitle">Select Language</div>
                  <LanguageSwitcher />
                </div>

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
                    Blog
                  </ActiveLink>
                  <ActiveLink className="topMobileLink" href="/support/my">
                    Support
                  </ActiveLink>
                  <ActiveLink className="topMobileLink" href="/dashboard/procurement-health">
                    AI Procurement OS
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
                  className="topSubLink"
                  href="/dashboard/inbox"
                  label="Unified Inbox"
                  variant="subLink"
                  title="Open unified inbox with unread chat count"
                />

                  <GlobalNotificationBell
                    className="topMobileLink"
                    label="Notifications"
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
          </Container>

          <div className="topSubBar">
            <Container className="topSubBarInner">
              <div className="topHint">
                Browse verified listings • Compare quotes • Contact vendors • Track
                enquiries
              </div>

              <div className="topSubLinks">
                <details className="rfqToggle">
                  <summary className="rfqToggleBtn">
                    🧑‍💼 My Dashboard <span className="rfqToggleCaret">▾</span>
                  </summary>

                  <div className="rfqTogglePanel" role="dialog" aria-label="My Dashboard menu">
                    <div className="rfqToggleTitle">My Dashboard</div>

                    <div className="rfqToggleDesc">
                      Everything you need in one place: submit requirements,
                      track vendor responses, compare quotes, and continue
                      messages.
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
                      Manage investment conversations and deal execution from one
                      place. Open investor or builder deal rooms and continue
                      document-sharing, stage tracking, and protected
                      discussions.
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

                <details className="rfqToggle">
                  <summary className="rfqToggleBtn">
                    ✍️ Submit Requirement <span className="rfqToggleCaret">▾</span>
                  </summary>

                  <div className="rfqTogglePanel" role="dialog" aria-label="Submit Requirement menu">
                    <div className="rfqToggleTitle">Submit Requirement</div>

                    <div className="rfqToggleDesc">
                      Submit your requirement for <b>Materials, Property, Services</b>{" "}
                      or <b>Rentals</b>. Upload a PDF / handwritten list or type
                      items. Nearby vendors will send competitive quotations.
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

                <GlobalUnreadBadge
                  className="topSubLink"
                  href="/vendor/inbox-v2"
                  label="Vendor Inbox"
                  variant="subLink"
                  title="Open vendor inbox with unread chat count"
                />

                <Link className="topSubLink" href="/dashboard/procurement-health">
                  AI Procurement OS
                </Link>

                <Link className="topSubLink" href="/support/my">
                  Support
                </Link>
              </div>
            </Container>
          </div>
        </header>

        <main style={{ marginTop: 8 }}>
          <Container className="pageBody">{children}</Container>
        </main>

        <footer className="siteFooter">
          <Container className="footerInner">
            <div>
              © <span suppressHydrationWarning>{new Date().getFullYear()}</span>{" "}
              3Bigha.com
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "center",
                fontSize: 13,
              }}
            >
              <Link href="/about">About Us</Link>
              <Link href="/contact">Contact Us</Link>
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
              <Link href="/refund-cancellation-policy">
                Refund / Cancellation
              </Link>
            </div>
          </Container>
        </footer>
      </body>
    </html>
  );
}