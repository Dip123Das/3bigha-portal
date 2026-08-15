import Link from "next/link";

type ModuleNodeProps = {
  href: string;
  className: string;
  icon: React.ReactNode;
  title: string;
  caption: string;
};

function ModuleNode({
  href,
  className,
  icon,
  title,
  caption,
}: ModuleNodeProps) {
  return (
    <Link className={`h04ModuleNode ${className}`} href={href}>
      <span className="h04ModuleIcon" aria-hidden="true">
        {icon}
      </span>

      <span className="h04ModuleText">
        <strong>{title}</strong>
        <small>{caption}</small>
      </span>
    </Link>
  );
}

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11.2 12 4l9 7.2" />
      <path d="M5.5 10.5V20h13v-9.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  );
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7.5h7v5H4zM13 7.5h7v5h-7z" />
      <path d="M7.5 14.5h9v5h-9z" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.2 6.2 3.6 3.6" />
      <path d="m5 19 6.5-6.5" />
      <path d="M16.2 4.2a4.1 4.1 0 0 0-4.8 5.2L4.7 16.1a2.1 2.1 0 1 0 3 3l6.7-6.7a4.1 4.1 0 0 0 5.2-4.8l-2.7 2.7-3.2-.8-.8-3.2 3.3-2.1Z" />
    </svg>
  );
}

function RentalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7" cy="18" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M3.5 16V9h9l3 4h4.5v3" />
      <path d="M8 9V5h5l2 4" />
    </svg>
  );
}

function RfqIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h8l4 4V20.5H6z" />
      <path d="M14 3.5v4h4" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
      <path d="M7 8h4M7 11h7" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 8 8-4 8 4-8 4z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </svg>
  );
}

function DispatchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h11v10H3zM14 11h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5h10v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3z" />
      <path d="M9.5 8h5M9.5 11.5h5M9.5 15h3" />
    </svg>
  );
}

export default function HeroBusinessOSArtwork() {
  return (
    <div className="h04Artwork" aria-label="3Bigha Business Operating System">
      <svg
        className="h04ConnectionMap"
        viewBox="0 0 760 620"
        role="img"
        aria-label="Connected 3Bigha marketplace and business operations"
      >
        <defs>
          <linearGradient id="h04Line" x1="0" x2="1">
            <stop offset="0%" stopColor="#3155d9" stopOpacity=".2" />
            <stop offset="50%" stopColor="#526ce2" stopOpacity=".75" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity=".25" />
          </linearGradient>

          <radialGradient id="h04Core" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#edf0ff" />
            <stop offset="100%" stopColor="#cdd5ff" stopOpacity=".12" />
          </radialGradient>

          <filter id="h04Glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <g className="h04Links" fill="none" stroke="url(#h04Line)">
          <path d="M380 304C310 250 240 190 142 132" />
          <path d="M380 304C446 250 520 190 620 132" />
          <path d="M380 304C290 298 210 296 105 294" />
          <path d="M380 304C470 298 548 296 656 294" />
          <path d="M380 304C310 368 248 420 155 492" />
          <path d="M380 304C450 368 515 424 607 493" />
          <path d="M380 304C380 400 380 470 380 558" />
        </g>

        <g className="h04PulsePoints">
          <circle cx="142" cy="132" r="5" />
          <circle cx="620" cy="132" r="5" />
          <circle cx="105" cy="294" r="5" />
          <circle cx="656" cy="294" r="5" />
          <circle cx="155" cy="492" r="5" />
          <circle cx="607" cy="493" r="5" />
          <circle cx="380" cy="558" r="5" />
        </g>

        <ellipse
          className="h04CoreShadow"
          cx="380"
          cy="410"
          rx="150"
          ry="40"
          fill="#314fc5"
          opacity=".12"
          filter="url(#h04Glow)"
        />

        <circle
          className="h04CoreHalo"
          cx="380"
          cy="304"
          r="134"
          fill="url(#h04Core)"
        />
      </svg>

      <ModuleNode
        href="/property"
        className="h04Property"
        icon={<HouseIcon />}
        title="Property"
        caption="Buy · Sell · Invest"
      />

      <ModuleNode
        href="/materials"
        className="h04Materials"
        icon={<MaterialsIcon />}
        title="Materials"
        caption="Source · Compare"
      />

      <ModuleNode
        href="/services"
        className="h04Services"
        icon={<ServicesIcon />}
        title="Services"
        caption="Hire · Execute"
      />

      <ModuleNode
        href="/rentals"
        className="h04Rentals"
        icon={<RentalIcon />}
        title="Rentals"
        caption="Equipment · Fleet"
      />

      <ModuleNode
        href="/rfq"
        className="h04Rfq"
        icon={<RfqIcon />}
        title="Requirements"
        caption="Post · Quote · Select"
      />

      <ModuleNode
        href="/dashboard/workspace"
        className="h04Workspace"
        icon={<WorkspaceIcon />}
        title="Workspace"
        caption="Manage every action"
      />

      <div className="h04Core">
        <div className="h04CoreOrbit h04OrbitOne" />
        <div className="h04CoreOrbit h04OrbitTwo" />

        <Link className="h04CoreBrand" href="/" aria-label="3Bigha home">
          <span className="h04CoreLogo">3</span>

          <span>
            <strong>3Bigha</strong>
            <small>Business Operating System</small>
          </span>
        </Link>

        <div className="h04CoreStatus">
          <span />
          Marketplace and operations connected
        </div>

        <div className="h04OperationalRail">
          <Link href="/dashboard/vendor/inventory">
            <InventoryIcon />
            <span>Inventory</span>
          </Link>

          <Link href="/dashboard/vendor/dispatch">
            <DispatchIcon />
            <span>Dispatch</span>
          </Link>

          <Link href="/dashboard/vendor/billing">
            <BillingIcon />
            <span>Billing</span>
          </Link>
        </div>
      </div>

      <div className="h04Assistant">
        <span className="h04AssistantSpark">✦</span>

        <span>
          <strong>Intelligent assistance</strong>
          <small>Human-controlled guidance</small>
        </span>
      </div>
    </div>
  );
}
