"use client";

import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { MENUS } from "@/lib/navigation/main-menu";
export default function DesktopMegaNavClient() {
  const [active, setActive] = useState<string | null>(null);
  const activeMenu = MENUS.find((m) => m.label === active) || null;

  return (
    <nav
      className="stableDesktopMegaNav"
      aria-label="Marketplace mega navigation"
      onMouseLeave={() => setActive(null)}
    >
      <Container className="stableDesktopMegaNavInner">
        {MENUS.map((menu) => (
          <div
            className="stableMegaItem"
            key={menu.label}
            onMouseEnter={() => setActive(menu.label)}
          >
            <Link className="stableMegaButton" href={menu.href}>
              <span>{menu.label}</span>
              <span className="stableMegaChevron">⌄</span>
            </Link>
          </div>
        ))}

        {activeMenu ? (
          <div className="stableMegaPanel" onMouseEnter={() => setActive(activeMenu.label)}>
            {activeMenu.label !== "Advanced Insights" ? (
              <div className="stableMegaGroup stableMegaMainGroup">
                <div className="stableMegaTitle">Main Page</div>
                <Link className="stableMegaMainLink" href={activeMenu.href}>
                  Open {activeMenu.label}
                </Link>
              </div>
            ) : null}

            {activeMenu.groups.map((group) => (
              <div className="stableMegaGroup" key={group.title}>
                <div className="stableMegaTitle">{group.title}</div>
                {group.links.map(([label, href]) => (
                  <Link key={href + label} href={href}>
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </Container>
    </nav>
  );
}
