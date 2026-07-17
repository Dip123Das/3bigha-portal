"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Container } from "@/components/layout/Container";
import { useExperienceMode } from "@/components/experience/ExperienceModeProvider";
import { useOptional3BOSRuntime } from "@/lib/3bos/context";
import { resolveShellNavigation } from "@/lib/3bos/navigation";
import { MENUS } from "@/lib/navigation/main-menu";
import ThreeBOSWorkContextChooser from "@/components/layout/ThreeBOSWorkContextChooser";

export default function DesktopMegaNavClient() {
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

  return (
    <nav className="stableDesktopMegaNav" aria-label="Marketplace mega navigation">
      <Container className="stableDesktopMegaNavInner">
        {visibleMenus.map((menu) => (
          <details className="stableMegaItem" key={menu.label}>
            <summary className="stableMegaButton">
              <span>{menu.label}</span>
              <span className="stableMegaChevron">⌄</span>
            </summary>

            <div className="stableMegaPanel">
              {menu.label === "My Work" ? <ThreeBOSWorkContextChooser /> : null}

              <div className="stableMegaGroup stableMegaMainGroup">
                <div className="stableMegaTitle">Main Page</div>
                <Link className="stableMegaMainLink" href={menu.href}>
                  Open {menu.label}
                </Link>
              </div>

              {menu.groups
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

              {menu.groups.some((group) => group.compatibility) ? (
                <details className="stableMegaCompatibility">
                  <summary>Other existing work</summary>
                  <div className="stableMegaCompatibilityGroups">
                    {menu.groups
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
          </details>
        ))}
      </Container>
    </nav>
  );
}
