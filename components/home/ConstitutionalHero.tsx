"use client";

type SearchScope =
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "price_today";

type HeroTab = "search" | "post";

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

const searchScopes: Array<{
  key: SearchScope;
  label: string;
}> = [
  { key: "property", label: "🏠 Property" },
  { key: "materials", label: "🧱 Materials" },
  { key: "services", label: "🛠️ Services" },
  { key: "rentals", label: "🚜 Rentals" },
  { key: "price_today", label: "📊 Price Today" },
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
        <div className="heroExperience">
          <div className="heroCopy">
            <div className="miniBadge">
              India&apos;s Human-First Business Operating System
            </div>

            <h1>
              Run your business
              <br />
              from <span>one place.</span>
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

            <a className="heroManageBusiness" href="/dashboard">
              Manage My Business <span aria-hidden="true">→</span>
            </a>
          </div>

          <nav className="heroVisualStage" aria-label="Explore 3Bigha">
            <div className="heroSkyline heroSkylineBack" aria-hidden="true" />
            <div className="heroSkyline heroSkylineFront" aria-hidden="true" />

            <a
              className="heroCapability heroCapabilityProperty"
              href="/property"
            >
              <span aria-hidden="true">⌂</span>
              Property
            </a>

            <a
              className="heroCapability heroCapabilityMaterials"
              href="/materials"
            >
              <span aria-hidden="true">▦</span>
              Materials
            </a>

            <a
              className="heroCapability heroCapabilityServices"
              href="/services"
            >
              <span aria-hidden="true">⚒</span>
              Services
            </a>

            <a
              className="heroCapability heroCapabilityRentals"
              href="/rentals"
            >
              <span aria-hidden="true">▣</span>
              Rentals
            </a>

            <a
              className="heroCapability heroCapabilityEquipment"
              href="/rentals"
              aria-label="Equipment rentals"
            >
              <span aria-hidden="true">◈</span>
              Equipment
            </a>

            <a
              className="heroCapability heroCapabilityMore"
              href="/search"
            >
              <span aria-hidden="true">⊙</span>
              More
            </a>

            <div className="heroPlatformGlow" aria-hidden="true" />

            <a
              className="heroPlatform"
              href="/"
              aria-label="3Bigha home"
            >
              <div className="heroPlatformTop">
                <div className="heroBrandMark">
                  <span className="heroBrandSymbol">3</span>
                  <div>
                    <strong>3Bigha</strong>
                    <small>Business Operating System</small>
                  </div>
                </div>
              </div>

              <div className="heroPlatformRing heroPlatformRingOne" />
              <div className="heroPlatformRing heroPlatformRingTwo" />
              <div className="heroPlatformRing heroPlatformRingThree" />
            </a>
          </nav>
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
              className={
                activeTab === "search"
                  ? "primaryAction"
                  : "secondaryAction"
              }
              onClick={onRunSearch}
            >
              🔍 Search Marketplace
            </button>

            <button
              type="button"
              className={
                activeTab === "post"
                  ? "primaryAction"
                  : "secondaryAction"
              }
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
        {sahajNeedsExpanded
          ? "Show fewer options"
          : "More ways to use 3Bigha"}
      </button>
    </section>
  );
}
