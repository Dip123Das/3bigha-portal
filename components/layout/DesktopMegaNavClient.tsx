"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { useExperienceMode } from "@/components/experience/ExperienceModeProvider";
import { MENUS } from "@/lib/navigation/main-menu";

export default function DesktopMegaNavClient() {
  const [active, setActive] = useState<string | null>(null);
  const { showSmart } = useExperienceMode();

  const visibleMenus = useMemo(
    () => MENUS.filter((menu) => showSmart || menu.label !== "Business"),
    [showSmart]
  );

  const activeMenu = visibleMenus.find((m) => m.label === active) || null;

  return (
    <nav
      className="stableDesktopMegaNav"
      aria-label="Marketplace mega navigation"
      onMouseLeave={() => setActive(null)}
    >
      <Container className="stableDesktopMegaNavInner">
        {visibleMenus.map((menu) => (
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
          <div
            className="stableMegaPanel"
            onMouseEnter={() => setActive(activeMenu.label)}
          >
            <div className="stableMegaGroup stableMegaMainGroup">
              <div className="stableMegaTitle">Main Page</div>
              <Link className="stableMegaMainLink" href={activeMenu.href}>
                Open {activeMenu.label}
              </Link>
            </div>

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
