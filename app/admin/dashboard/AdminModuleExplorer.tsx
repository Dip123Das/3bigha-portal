"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BrainCircuit,
  Building2,
  Landmark,
  Search,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { CommandModule } from "@/lib/admin/command-center";
import styles from "./AdminCommandCenter.module.css";
import ux from "./AdminCommandCenterUX.module.css";

const groups = ["All", "Trust", "Marketplace", "Intelligence", "Revenue", "Platform"] as const;
type ModuleGroup = (typeof groups)[number];

const groupIcons: Record<Exclude<ModuleGroup, "All">, LucideIcon> = {
  Trust: ShieldCheck,
  Marketplace: Building2,
  Intelligence: BrainCircuit,
  Revenue: Landmark,
  Platform: Settings2,
};

export default function AdminModuleExplorer({ modules }: { modules: CommandModule[] }) {
  const [activeGroup, setActiveGroup] = useState<ModuleGroup>("All");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const visibleModules = useMemo(() => modules.filter((module) => {
    const inGroup = activeGroup === "All" || module.group === activeGroup;
    const matchesQuery = !normalizedQuery
      || `${module.title} ${module.description} ${module.group}`.toLowerCase().includes(normalizedQuery);
    return inGroup && matchesQuery;
  }), [activeGroup, modules, normalizedQuery]);

  return (
    <div className={ux.moduleExplorer}>
      <div className={ux.explorerToolbar}>
        <label className={ux.moduleSearch}>
          <Search size={17} aria-hidden="true" />
          <span className={ux.srOnly}>Find an admin workspace</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a workspace, task or control…"
          />
          <kbd>{visibleModules.length}</kbd>
        </label>
        <div className={ux.groupFilters} aria-label="Filter admin workspaces">
          {groups.map((group) => {
            const count = group === "All" ? modules.length : modules.filter((module) => module.group === group).length;
            return (
              <button
                key={group}
                type="button"
                className={activeGroup === group ? ux.activeFilter : undefined}
                onClick={() => setActiveGroup(group)}
                aria-pressed={activeGroup === group}
              >
                {group}<span>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {visibleModules.length ? (
        <div className={`${styles.moduleGrid} ${ux.moduleGrid}`}>
          {visibleModules.map((module) => {
            const Icon = groupIcons[module.group];
            return (
              <Link key={module.href} href={module.href} className={`${styles.moduleCard} ${ux.moduleCardEnhanced}`}>
                <div className={ux.moduleCardTop}>
                  <span className={`${ux.moduleIcon} ${ux[`group${module.group}`]}`}><Icon size={18} aria-hidden="true" /></span>
                  <small>{module.group}</small>
                </div>
                <strong>{module.title}</strong>
                <p>{module.description}</p>
                <b>Open workspace <ArrowUpRight size={14} aria-hidden="true" /></b>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={ux.emptyModules}>
          <Search size={24} aria-hidden="true" />
          <strong>No matching workspace</strong>
          <span>Try a broader word or choose another control domain.</span>
          <button type="button" onClick={() => { setQuery(""); setActiveGroup("All"); }}>Show all workspaces</button>
        </div>
      )}
    </div>
  );
}
