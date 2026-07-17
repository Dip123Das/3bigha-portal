"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useExperienceMode } from "@/components/experience/ExperienceModeProvider";
import { useOptional3BOSRuntime } from "@/lib/3bos/context";
import { resolveShellNavigation } from "@/lib/3bos/navigation";
import { MENUS } from "@/lib/navigation/main-menu";
import ThreeBOSWorkContextChooser from "@/components/layout/ThreeBOSWorkContextChooser";

export default function MobileMegaNavClient() {
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
    <div className="mobileMegaNav">
      {visibleMenus.map((menu) => (
        <details className="mobileMegaItem" key={menu.label}>
          <summary className="mobileMegaButton">
            <span>{menu.label}</span>
            <span className="mobileMegaChevron">▾</span>
          </summary>

          <div className="mobileMegaPanel">
            {menu.label === "My Work" ? <ThreeBOSWorkContextChooser /> : null}

            <Link className="mobileMegaMainLink" href={menu.href}>
              Open {menu.label}
            </Link>

            {menu.groups
              .filter((group) => !group.compatibility)
              .map((group) => (
                <div className="mobileMegaGroup" key={group.title}>
                  <div className="mobileMegaTitle">{group.title}</div>
                  {group.links.map(([label, href]) => (
                    <Link key={href + label} href={href}>
                      {label}
                    </Link>
                  ))}
                </div>
              ))}

            {menu.groups.some((group) => group.compatibility) ? (
              <details className="mobileMegaCompatibility">
                <summary>Other existing work</summary>
                {menu.groups
                  .filter((group) => group.compatibility)
                  .map((group) => (
                    <div className="mobileMegaGroup" key={group.title}>
                      <div className="mobileMegaTitle">{group.title}</div>
                      {group.links.map(([label, href]) => (
                        <Link key={href + label} href={href}>
                          {label}
                        </Link>
                      ))}
                    </div>
                  ))}
              </details>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}
