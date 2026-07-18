"use client";

type SearchScope =
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "investment";

type HeroTab = "search" | "ai" | "post";

type ConstitutionalHeroProps = {
  activeTab: HeroTab;
  placeholder: string;
  query: string;
  scope: SearchScope;
  sahajNeedsExpanded: boolean;
  onActiveTabChange: (tab: HeroTab) => void;
  onQueryChange: (value: string) => void;
  onScopeChange: (scope: SearchScope) => void;
  onRunSearch: () => void;
  onSubmitRequirement: () => void;
  onToggleSahajNeeds: () => void;
};

const constitutionalPillars = [
  {
    label: "Marketplace",
    href: "/search",
    description: "Search property, materials, services, rentals and vendors",
  },
  {
    label: "Business Workspace",
    href: "/dashboard/vendor/workspace",
    description: "Open your connected business workspace",
  },
  {
    label: "Sahaj AI",
    href: "/need",
    description: "Describe what you need in ordinary language",
  },
  {
    label: "RFQ",
    href: "/rfq/start",
    description: "Create and submit a requirement",
  },
  {
    label: "Local Geography",
    href: "/search",
    description: "Discover nearby marketplace opportunities",
  },
  {
    label: "Operations",
    href: "/dashboard/vendor",
    description: "Manage business operations and activity",
  },
  {
    label: "Business Growth",
    href: "/vendor-opportunities",
    description: "Explore demand and growth opportunities",
  },
];

const searchScopes: Array<{
  key: SearchScope;
  label: string;
}> = [
  { key: "property", label: "🏠 Property" },
  { key: "materials", label: "🧱 Materials" },
  { key: "services", label: "🛠️ Services" },
  { key: "rentals", label: "🚜 Rentals" },
  { key: "investment", label: "📊 Price Today" },
];

export default function ConstitutionalHero({
  activeTab,
  placeholder,
  query,
  scope,
  sahajNeedsExpanded,
  onActiveTabChange,
  onQueryChange,
  onScopeChange,
  onRunSearch,
  onSubmitRequirement,
  onToggleSahajNeeds,
}: ConstitutionalHeroProps) {
  return (
    <section className="heroShell constitutionalHero">
      <div className="heroGrid">
        <div className="heroCopy">
          <div className="miniBadge">
            🇮🇳 India&apos;s Human-First Business Operating System
          </div>

          <h1>
            <span>Run your business from one place.</span>
            Buy, sell, build, hire, rent and grow with 3Bigha.
          </h1>

          <p className="constitutionalHeroLead">
            3Bigha Business Operating System (3BOS) connects marketplace
            discovery, requirements, vendors, local geography, business
            workspace and intelligent assistance in one unified platform.
          </p>

          <p className="constitutionalHeroPromise">
            You tell us what you need in ordinary language. 3Bigha quietly
            prepares the right path, information and business actions in the
            background.
          </p>

          <div
            className="constitutionalPillars"
            aria-label="3Bigha Business Operating System capabilities"
          >
            {constitutionalPillars.map((pillar) => (
              <a
                key={pillar.label}
                href={pillar.href}
                title={pillar.description}
                aria-label={`${pillar.label}: ${pillar.description}`}
              >
                {pillar.label}
              </a>
            ))}
          </div>

          <div className="heroFeatureRow">
            <a href="/search">🔍 Search</a>
            <a href="/rfq/start">📮 Submit Requirement</a>
            <a href="/construction-cost">🏗️ Build</a>
            <a href="/dashboard">📋 Manage</a>
            <a href="/vendor-opportunities">📈 Grow</a>
          </div>
        </div>

        <div className="searchCard">
          <div className="searchCardIdentity">
            <span>Start with your real need</span>
            <small>No technical terms required</small>
          </div>

          <div className="searchTabs">
            <button
              type="button"
              className={activeTab === "search" ? "active" : ""}
              onClick={() => onActiveTabChange("search")}
            >
              ⌕ Search
            </button>

            <button
              type="button"
              className={activeTab === "ai" ? "active" : ""}
              onClick={() => onActiveTabChange("ai")}
            >
              ✨ Get Guidance
            </button>

            <button
              type="button"
              className={activeTab === "post" ? "active" : ""}
              onClick={() => onActiveTabChange("post")}
            >
              📮 Post Requirement
            </button>
          </div>

          <label className="heroInputLabel" htmlFor="homepage-business-need">
            What do you need today?
          </label>

          <textarea
            id="homepage-business-need"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
          />

          <div className="typeChips" aria-label="Choose marketplace area">
            {searchScopes.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={scope === key ? "active" : ""}
                onClick={() => onScopeChange(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="searchActions">
            <button
              type="button"
              className="primaryAction"
              onClick={onRunSearch}
            >
              🔍 Search Marketplace
            </button>

            <button
              type="button"
              className="secondaryAction"
              onClick={onSubmitRequirement}
            >
              ⚡ Submit Requirement
            </button>
          </div>

          <p className="heroAssistanceNote">
            3Bigha may use intelligent assistance to organise your request, but
            you remain in control.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="mobileSahajMoreButton"
        onClick={onToggleSahajNeeds}
        aria-expanded={sahajNeedsExpanded}
      >
        {sahajNeedsExpanded ? "Show fewer options" : "More ways to use 3Bigha"}
      </button>
    </section>
  );
}
