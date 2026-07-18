"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { useExperienceMode } from "@/components/experience/ExperienceModeProvider";
import { useOptional3BOSRuntime } from "@/lib/3bos/context";
import { resolveShellNavigation } from "@/lib/3bos/navigation";
import { MENUS } from "@/lib/navigation/main-menu";
import ThreeBOSWorkContextChooser from "@/components/layout/ThreeBOSWorkContextChooser";

export default function DesktopMegaNavClient() {
  const [active, setActive] = useState<string | null>(null);
  const { showSmart } = useExperienceMode();
  const runtimeContext = useOptional3BOSRuntime();

  const visibleMenus = useMemo(
    () =>
      resolveShellNavigation({
        menus: MENUS,
        showSmart,
        runtime: runtimeContext?.runtime ?? null,
        runtimeStatus: runtimeContext?.status ?? "uninitialized",
      }),
    [runtimeContext?.runtime, runtimeContext?.status, showSmart]
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
            {activeMenu.label === "My Work" ? (
              <ThreeBOSWorkContextChooser />
            ) : null}

            <div className="stableMegaGroup stableMegaMainGroup">
              <div className="stableMegaTitle">Main Page</div>
              <Link className="stableMegaMainLink" href={activeMenu.href}>
                Open {activeMenu.label}
              </Link>
            </div>

            {activeMenu.groups
              .filter((group) => !group.compatibility)
              .map((group) => (
                <div className="stableMegaGroup" key={group.title}>
                  <div className="stableMegaTitle">{group.title}</div>
                  {group.links.map(([label, href]) => (
                    <Link key={href + label} href={href}>
                      {label}
                    </Link>
                  ))}
                </div>
              ))}

            {activeMenu.groups.some((group) => group.compatibility) ? (
              <details className="stableMegaCompatibility">
                <summary>Other existing work</summary>
                <div className="stableMegaCompatibilityGroups">
                  {activeMenu.groups
                    .filter((group) => group.compatibility)
                    .map((group) => (
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
              </details>
            ) : null}
          </div>
        ) : null}
      </Container>
    </nav>
  );
}
