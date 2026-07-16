"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type AiTool = {
  icon: string;
  title: string;
  detail: string;
  href: string;
  group: string;
};

const tools: AiTool[] = [
  {
    icon: "▶️",
    title: "Resume Previous Work",
    detail: "Continue your last search, requirement or marketplace activity.",
    href: "/search",
    group: "Continue Your Work",
  },
  {
    icon: "🏗️",
    title: "Estimate Construction",
    detail: "Estimate construction cost, materials and project requirements.",
    href: "/construction-cost",
    group: "Continue Your Work",
  },
  {
    icon: "👷",
    title: "Find Builders",
    detail: "Find builders, contractors and construction professionals.",
    href: "/services",
    group: "Continue Your Work",
  },
  {
    icon: "📈",
    title: "Investment Check",
    detail: "Explore property and investment opportunities.",
    href: "/investment/opportunities",
    group: "Continue Your Work",
  },
  {
    icon: "⚖️",
    title: "Legal Verification",
    detail: "Find legal and property verification services.",
    href: "/services?q=legal%20verification",
    group: "Continue Your Work",
  },
  {
    icon: "🔍",
    title: "AI Smart Search",
    detail: "Search property, materials, services and rentals.",
    href: "/search",
    group: "Search & Discovery",
  },
  {
    icon: "🔎",
    title: "Find Vendors",
    detail: "Locate suppliers, contractors and service providers.",
    href: "/vendor-opportunities",
    group: "Search & Discovery",
  },
  {
    icon: "📝",
    title: "Draft RFQ",
    detail: "Create a requirement and collect vendor quotes.",
    href: "/rfq",
    group: "RFQ & Procurement",
  },
  {
    icon: "🧱",
    title: "Material RFQ",
    detail: "Request cement, steel, bricks and other materials.",
    href: "/materials/rfq",
    group: "RFQ & Procurement",
  },
  {
    icon: "📈",
    title: "Price Prediction",
    detail: "Check local price intelligence and market trend.",
    href: "/price-today",
    group: "Calculators & Intelligence",
  },
  {
    icon: "📐",
    title: "Cost Calculator",
    detail: "Estimate construction cost quickly.",
    href: "/cost-calculator",
    group: "Calculators & Intelligence",
  },
  {
    icon: "📏",
    title: "Land Area Calculator",
    detail: "Convert and calculate land measurements.",
    href: "/land-area-calculator",
    group: "Calculators & Intelligence",
  },
  {
    icon: "🏦",
    title: "EMI Calculator",
    detail: "Calculate loan EMI and affordability.",
    href: "/emi-calculator",
    group: "Calculators & Intelligence",
  },
  {
    icon: "🏠",
    title: "Turnkey Package",
    detail: "Explore ready construction service packages.",
    href: "/services/turnkey",
    group: "Project Services",
  },
  {
    icon: "💬",
    title: "AI Inbox",
    detail: "Open buyer-vendor messages and AI assistance.",
    href: "/dashboard/inbox-v2",
    group: "Assistance",
  },
  {
    icon: "🛡️",
    title: "Support AI",
    detail: "Raise a support request with guided help.",
    href: "/support/new",
    group: "Assistance",
  },
];

const groups = Array.from(new Set(tools.map((tool) => tool.group)));

export default function GlobalAiCopilot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // The constitutional homepage begins with the person's need. AI remains
  // available inside the working experience, but does not compete for attention here.
  if (pathname === "/") return null;

  return (
    <div className={open ? "globalAiShell globalAiShellOpen" : "globalAiShell"}>
      <button
        type="button"
        className="globalAiButton"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close 3Bigha AI Tools" : "Open 3Bigha AI Tools"}
      >
        <span className="globalAiIcon">🤖</span>
        <span className="globalAiText">
          <strong>3Bigha AI</strong>
          <small>{open ? "Close Tools" : "AI Tools"}</small>
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="globalAiBackdrop"
            onClick={() => setOpen(false)}
            aria-label="Close AI Tools"
          />

          <section className="globalAiPanel" role="dialog" aria-label="3Bigha AI Tools">
            <div className="globalAiPanelHeader">
              <div>
                <strong>🤖 3Bigha AI Tools</strong>
                <span>AI-powered tools for construction, property and procurement.</span>
              </div>

              <button
                type="button"
                className="globalAiClose"
                onClick={() => setOpen(false)}
                aria-label="Close AI Tools"
              >
                ×
              </button>
            </div>

            <div className="globalAiToolGroups">
              {groups.map((group) => (
                <div className="globalAiToolGroup" key={group}>
                  <p>{group}</p>
                  <div className="globalAiTools">
                    {tools
                      .filter((tool) => tool.group === group)
                      .map((tool) => (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          className="globalAiToolCard"
                          onClick={() => setOpen(false)}
                        >
                          <span className="globalAiToolIcon">{tool.icon}</span>
                          <span className="globalAiToolCopy">
                            <strong>{tool.title}</strong>
                            <small>{tool.detail}</small>
                          </span>
                          <span className="globalAiToolArrow">→</span>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <style jsx>{`
        .globalAiShell {
          position: fixed;
          left: 18px;
          bottom: 22px;
          z-index: 10070;
          width: auto;
          pointer-events: none;
        }

        .globalAiButton {
          pointer-events: auto;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          color: #fff;
          padding: 9px 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 18px 42px rgba(37, 99, 235, 0.34);
          cursor: pointer;
          font-weight: 1000;
        }

        .globalAiText {
          display: grid;
          line-height: 1.05;
          text-align: left;
        }

        .globalAiText strong {
          font-size: 12px;
          color: #fff;
        }

        .globalAiText small {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.9);
        }

        .globalAiBackdrop {
          position: fixed;
          inset: 0;
          border: 0;
          background: rgba(15, 23, 42, 0.22);
          backdrop-filter: blur(2px);
          z-index: 10068;
          pointer-events: auto;
        }

        .globalAiPanel {
          position: fixed;
          left: 18px;
          bottom: 78px;
          width: 420px;
          max-width: calc(100vw - 28px);
          max-height: min(720px, calc(100vh - 110px));
          overflow-y: auto;
          border-radius: 24px;
          background: #fff;
          border: 1px solid rgba(15, 23, 42, 0.1);
          box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
          padding: 14px;
          z-index: 10072;
          pointer-events: auto;
        }

        .globalAiPanelHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 13px;
          margin-bottom: 12px;
          border-radius: 18px;
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
        }

        .globalAiPanelHeader strong {
          display: block;
          color: #fff;
          font-size: 16px;
          font-weight: 1000;
        }

        .globalAiPanelHeader span {
          display: block;
          color: rgba(255, 255, 255, 0.84);
          font-size: 12px;
          font-weight: 750;
          margin-top: 3px;
          line-height: 1.35;
        }

        .globalAiClose {
          border: 0;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          font-size: 22px;
          cursor: pointer;
        }

        .globalAiToolGroups {
          display: grid;
          gap: 13px;
        }

        .globalAiToolGroup p {
          margin: 0 0 7px;
          color: #64748b;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .globalAiTools {
          display: grid;
          gap: 8px;
        }

        .globalAiToolCard {
          display: grid;
          grid-template-columns: 38px 1fr auto;
          align-items: center;
          gap: 10px;
          width: 100%;
          min-height: 66px;
          border-radius: 17px;
          padding: 11px 12px;
          text-decoration: none;
          background: linear-gradient(180deg, #ffffff, #f8fbff);
          border: 1px solid rgba(37, 99, 235, 0.16);
          color: #0f172a;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            border-color 0.16s ease,
            background 0.16s ease;
        }

        .globalAiToolCard:hover {
          transform: translateY(-2px);
          border-color: #93c5fd;
          background: linear-gradient(180deg, #eef4ff, #ffffff);
          box-shadow: 0 18px 38px rgba(37, 99, 235, 0.16);
        }

        .globalAiToolIcon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef4ff;
          font-size: 18px;
        }

        .globalAiToolCopy {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .globalAiToolCopy strong {
          color: #0f172a;
          font-size: 13px;
          font-weight: 1000;
          line-height: 1.15;
        }

        .globalAiToolCopy small {
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.25;
        }

        .globalAiToolArrow {
          color: #2563eb;
          font-size: 18px;
          font-weight: 1000;
        }

        @media (max-width: 760px) {
          .globalAiShell {
            left: 10px;
            bottom: 14px;
          }

          .globalAiPanel {
            left: 10px;
            right: 10px;
            bottom: 70px;
            width: auto;
            max-width: none;
            max-height: min(680px, calc(100vh - 92px));
          }
        }
      `}</style>
    </div>
  );
}
