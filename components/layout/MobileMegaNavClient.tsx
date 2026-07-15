"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useExperienceMode } from "@/components/experience/ExperienceModeProvider";
import { useOptional3BOSRuntime } from "@/lib/3bos/context";
import { resolveShellNavigation } from "@/lib/3bos/navigation";
import { MENUS } from "@/lib/navigation/main-menu";

export default function MobileMegaNavClient() {
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (target && wrapRef.current && !wrapRef.current.contains(target)) {
        setOpen(null);
      }
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (open && !visibleMenus.some((menu) => menu.label === open)) {
      setOpen(null);
    }
  }, [open, visibleMenus]);

  return (
    <div ref={wrapRef} className="mobileMegaNav">
      {visibleMenus.map((menu) => {
        const isOpen = open === menu.label;

        return (
          <div className="mobileMegaItem" key={menu.label}>
            <button
              type="button"
              className="mobileMegaButton"
              onClick={() => setOpen(isOpen ? null : menu.label)}
            >
              <span>{menu.label}</span>
              <span>{isOpen ? "▴" : "▾"}</span>
            </button>

            {isOpen ? (
              <div className="mobileMegaPanel">
                <Link
                  className="mobileMegaMainLink"
                  href={menu.href}
                  onClick={() => setOpen(null)}
                >
                  Open {menu.label}
                </Link>

                {menu.groups.map((group) => (
                  <div className="mobileMegaGroup" key={group.title}>
                    <div className="mobileMegaTitle">{group.title}</div>

                    {group.links.map(([label, href]) => (
                      <Link
                        key={href + label}
                        href={href}
                        onClick={() => setOpen(null)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
