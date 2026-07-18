// app/layout.tsx
import AppWebViewViewportGuard from "@/components/mobile/AppWebViewViewportGuard";
import MobileAppSearchBar from "@/components/mobile/MobileAppSearchBar";
import AppOAuthReturnBridge from "@/components/mobile/AppOAuthReturnBridge";
import AppOAuthBrowserBounce from "@/components/mobile/AppOAuthBrowserBounce";
import MasterAdminDebugTools from "@/components/admin/MasterAdminDebugTools";
import "./globals.css";
import "./ui-kit.css";
import "./home.css";
import { createMetadata } from "@/lib/seo/metadata";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/Container";
import { ThreeBOSRuntimeProvider } from "@/lib/3bos/context";
import ExperienceModeProvider from "@/components/experience/ExperienceModeProvider";

// confirmed existing files
import BuildConVendorPopup from "@/app/_components/BuildConVendorPopup";
import AuthButtons from "./_components/AuthButtons";
import ActiveLink from "./_components/ActiveLink";
import GlobalNotificationBell from "./_components/GlobalNotificationBell";
import PresenceHeartbeat from "./_components/PresenceHeartbeat";
import ThreeBOSAuthenticatedBootstrap from "./_components/ThreeBOSAuthenticatedBootstrap";
import MobileMenuAutoClose from "./_components/MobileMenuAutoClose";
import DesktopMegaNavClient from "@/components/layout/DesktopMegaNavClient";
import MobileMegaNavClient from "@/components/layout/MobileMegaNavClient";
import GlobalAiCopilot from "./_components/GlobalAiCopilot";
import GlobalWorkflowContinuityRibbon from "@/components/workflow/GlobalWorkflowContinuityRibbon";
import AutoTranslatePage from "@/components/language/AutoTranslatePage";
import LanguageSwitcher from "@/components/language/LanguageSwitcher";
import RegisterServiceWorker from "@/components/pwa/RegisterServiceWorker";
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt";
import MobilePushRuntime from "@/components/mobile/MobilePushRuntime";
import MobileForegroundNotifications from "@/components/mobile/MobileForegroundNotifications";
import MobileOperationalDock from "@/components/mobile/MobileOperationalDock";

export const metadata = createMetadata({
  title:
    "3bigha.com | AI-Powered Property, Construction, RFQ, Materials & Vendor Marketplace India",

  description:
    "3bigha.com is India's AI-powered real estate, construction, RFQ, materials, rentals and vendor marketplace platform. Search property, compare vendors, submit procurement RFQs, discover local services and track AI-powered price intelligence across regional marketplaces.",

  path: "/",

  image: "/og-image-new.jpg",

  keywords: [
    "3bigha",
    "3 bigha",
    "3bigha.com",

    "property marketplace",
    "real estate marketplace India",
    "construction marketplace",
    "materials marketplace",
    "RFQ marketplace",
    "vendor marketplace",

    "AI marketplace",
    "AI procurement platform",
    "AI RFQ system",

    "building materials marketplace",
    "construction services",
    "rental services",

    "property listing India",
    "construction vendors India",

    "West Bengal construction marketplace",
    "Cooch Behar property",
  ],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b57d0",
};

export const icons: Metadata["icons"] = {
  icon: [
    { url: "/favicon.ico?v=3" },
    { url: "/favicon-32x32.png?v=3", sizes: "32x32", type: "image/png" },
    { url: "/favicon-16x16.png?v=3", sizes: "16x16", type: "image/png" },
  ],

  apple: [
    {
      url: "/apple-touch-icon.png?v=3",
      sizes: "180x180",
      type: "image/png",
    },
  ],

  shortcut: ["/favicon.ico?v=3"],
};

export const manifest = "/site.webmanifest";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
        <AppWebViewViewportGuard />
        <AppOAuthReturnBridge />
        <AppOAuthBrowserBounce />
      <body className="threebigha-app-body">
        <ThreeBOSRuntimeProvider>
          <ExperienceModeProvider>
          <ThreeBOSAuthenticatedBootstrap />
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
              className="topBrand mobileHeaderOnly"
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
                    alt="3bigha.com AI-powered property construction materials and vendor marketplace logo"
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

            <div
              className="topBrand desktopHeaderOnly"
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
                    alt="3bigha.com AI-powered property construction materials and vendor marketplace logo"
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

            <form className="topSearchQuick desktopHeaderOnly" action="/search" method="get">
              <input
                className="topSearchInput"
                name="q"
                placeholder="Search..."
              />
              <button className="topSearchButton" type="submit">
                Search
              </button>
            </form>

            <div data-no-translate="true" className="topLanguageSelector desktopHeaderOnly">
              <LanguageSwitcher />
            </div>

            <div className="topActions desktopHeaderOnly">
              <details className="postMenu">
                <summary className="topBtn topBtnPrimary">
                  Post / List <span className="postMenuCaret">▾</span>
                </summary>

                <div className="postMenuPanel" style={{ zIndex: 99999 }} role="dialog" aria-label="Post or List">
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

              <GlobalNotificationBell
                className="topBtn topBtnGhost"
                label="Alerts"
              />

              <div className="desktopAuthSlot">
                <AuthButtons />
              </div>
            </div>

            <div className="mobileAccountStrip mobileHeaderOnly">
              <AuthButtons />
            </div>

            <details className="topMobileMenu mobileHeaderOnly">
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
                  <MobileMegaNavClient />
                </div>

                <div className="topMobileGroup">
                  <div className="topMobileTitle">My Work</div>

                  <ActiveLink className="topMobileLink" href="/dashboard/buyer">
                    My Dashboard
                  </ActiveLink>

                  <ActiveLink className="topMobileLink" href="/dashboard/buyer/rfqs">
                    My RFQs / Compare Quotes
                  </ActiveLink>

                  <GlobalNotificationBell
                    className="topMobileLink"
                    label="Notifications"
                  />

                  <ActiveLink className="topMobileLink" href="/rfq">
                    Submit Requirement
                  </ActiveLink>

                  <ActiveLink className="topMobileLink" href="/dashboard/vendor">
                    Vendor Hub
                  </ActiveLink>

                  <ActiveLink
                    className="topMobileLink"
                    href="/dashboard/investor/deal-rooms"
                  >
                    Investment Workspace
                  </ActiveLink>

                  <ActiveLink
                    className="topMobileLink"
                    href="/dashboard/procurement-os"
                  >
                    Procurement Workspace
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
                      <Link className="rfqTogglePrimary" href="/rfq">
                        ✍️ Submit Requirement →
                      </Link>

                      <Link className="rfqToggleSecondary" href="/dashboard/buyer/rfqs">
                        📄 My RFQs (View vendor responses + Compare quotes) →
                      </Link>

                      <Link className="rfqToggleSecondary" href="/dashboard/inbox-v2">
                        📥 Unified Inbox (All Chats) →
                      </Link>

                      <Link className="rfqToggleSecondary" href="/dashboard/buyer">
                        🧾 Buyer Dashboard →
                      </Link>

                      <Link className="rfqToggleSecondary" href="/dashboard/vendor">
                        🏪 Vendor Hub Dashboard →
                      </Link>
                    </div>
                  </div>
                </details>

                <details className="rfqToggle">
                  <summary className="rfqToggleBtn">
                    🧰 Workspace <span className="rfqToggleCaret">▾</span>
                  </summary>

                  <div className="rfqTogglePanel" role="dialog" aria-label="Investment menu">
                    <div className="rfqToggleTitle">Workspace</div>

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

                      <Link
                        className="rfqToggleSecondary"
                        href="/dashboard/procurement-health"
                      >
                        ⚙️ Procurement Workspace →
                      </Link>

                      <Link
                        className="rfqToggleSecondary"
                        href="/support/my"
                      >
                        🛟 Support →
                      </Link>

                      <Link
                        className="rfqToggleSecondary"
                        href="/founding-vendors"
                      >
                        🏆 Founding Partners →
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
                      <Link className="rfqTogglePrimary" href="/rfq">
                        Start RFQ (Property / Materials / Services / Rentals) →
                      </Link>
                    </div>
                  </div>
                </details>
</div>
            </Container>
          </div>
        </header>

        <MobileAppSearchBar />

        <DesktopMegaNavClient />

        <div
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "visible",
            clipPath: "inset(50%)",
            whiteSpace: "nowrap",
          }}
        >
          3bigha.com is an AI-powered property marketplace, construction marketplace,
          RFQ procurement platform, materials marketplace, rental marketplace and
          vendor discovery platform serving India with regional language support,
          AI procurement workflows, vendor comparison and local marketplace search.
        </div>

        <main style={{ marginTop: 8 }}>
          <Container className="pageBody">{children}</Container>
        </main>

        <GlobalAiCopilot />
        <GlobalWorkflowContinuityRibbon />
        <RegisterServiceWorker />
        <PWAInstallPrompt />
        <MobilePushRuntime />
        <MobileForegroundNotifications />
        <MobileOperationalDock />

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
              <Link href="/property">Property Marketplace</Link>
              <Link href="/materials">Materials Marketplace</Link>
              <Link href="/services">Construction Services</Link>
              <Link href="/rentals">Rental Marketplace</Link>
              <Link href="/vendor-opportunities">🚀 Vendor Opportunities</Link>
              <Link href="/rfq">Submit RFQ</Link>
              <Link href="/ai-search-guide">Search Guide</Link>
              <Link href="/about">About Us</Link>
              <Link href="/contact">Contact Us</Link>
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
              <Link href="/refund-cancellation-policy">
                Refund / Cancellation
              </Link>
              <Link href="/search/cement-price-cooch-behar">
                Cement Price Cooch Behar
              </Link>

              <Link href="/seo/property/west-bengal/cooch-behar">
                Cooch Behar Property
              </Link>

              <Link href="/ai-search-guide">
                Marketplace Search
              </Link>
              <Link href="/search/land-for-sale-cooch-behar">
                Land for Sale Cooch Behar
              </Link>

              <Link href="/search/building-materials-west-bengal">
                Building Materials West Bengal
              </Link>

              <Link href="/search/rajmistri-near-me">
                Rajmistri Near Me
              </Link>
            </div>
          </Container>
        </footer>

          <MasterAdminDebugTools />

          <BuildConVendorPopup />
          </ExperienceModeProvider>
        </ThreeBOSRuntimeProvider>
      </body>
    </html>
  );
}
