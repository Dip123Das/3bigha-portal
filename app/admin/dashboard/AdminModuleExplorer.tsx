"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import type { CommandModule } from "@/lib/admin/command-center";
import styles from "./AdminWorkspaceCategories.module.css";

const categories = [
  {
    id: "members",
    title: "Members & Business Growth",
    description: "Manage member accounts, vendors and recruitment.",
    paths: [
      "/admin/users",
      "/admin/dashboard/vendor-control",
      "/admin/dashboard/vendor-recruitment",
    ],
  },
  {
    id: "trust",
    title: "Registration & Trust",
    description: "Review registration evidence, verification and AI moderation.",
    paths: [
      "/admin/verification-operations",
      "/admin/verification-workbench",
      "/admin/verification-reviews",
      "/admin/individual-professional-reviews",
      "/admin/moderation",
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace & Listings",
    description: "Review and manage properties, materials, services and rentals.",
    paths: [
      "/admin/marketplace-control",
      "/admin/property",
      "/admin/materials",
      "/admin/services",
      "/admin/rentals",
    ],
  },
  {
    id: "business",
    title: "Business Operations",
    description: "Inspect inventory, RFQs and construction operations.",
    paths: [
      "/admin/inventory-operations",
      "/admin/rfq-intelligence",
      "/admin/construction-control",
    ],
  },
  {
    id: "finance",
    title: "Revenue & Finance",
    description: "Manage revenue, subscriptions, finance leads and investments.",
    paths: [
      "/admin/revenue-control",
      "/admin/dashboard/finance-leads",
      "/admin/dashboard/banker-verification",
      "/admin/dashboard/investment",
    ],
  },
  {
    id: "support",
    title: "Support & Communications",
    description: "Handle tickets, appeals, publishing and communications.",
    paths: [
      "/admin/dashboard/support",
      "/admin/support-operations",
      "/admin/content-communications",
      "/admin/blog",
    ],
  },
  {
    id: "masters",
    title: "Master Data & Geography",
    description: "Maintain identities, taxonomies, measurement and geography.",
    paths: [
      "/admin/dashboard/master-data",
      "/admin/dashboard/geography",
    ],
  },
  {
    id: "intelligence",
    title: "Intelligence & Visibility",
    description: "Inspect market signals, review prices and manage SEO.",
    paths: [
      "/admin/dashboard/marketplace-intelligence",
      "/admin/dashboard/price-updates",
      "/admin/dashboard/seo",
    ],
  },
  {
    id: "platform",
    title: "Platform & Security",
    description: "Oversee production health, governance, security and releases.",
    paths: [
      "/admin/dashboard/operations",
      "/admin/platform-governance",
      "/admin/reliability",
      "/admin/security-compliance",
      "/admin/release-readiness",
    ],
  },
];

const knownPaths = new Set(categories.flatMap(category => category.paths));

export default function AdminModuleExplorer({
  modules,
}: {
  modules: CommandModule[];
}) {
  const instanceId = useId();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  // Only categorise modules already authorised by the server.
  // Never create additional links from the category definitions.
  const availableCategories = useMemo(() => {
    const grouped = categories.map(category => ({
      ...category,
      modules: category.paths.flatMap(path =>
        modules.filter(module => module.href === path)
      ),
    })).filter(category => category.modules.length > 0);

    // Future modules remain discoverable until explicitly categorised.
    const remaining = modules.filter(module => !knownPaths.has(module.href));
    if (remaining.length) {
      grouped.push({
        id: "additional",
        title: "Additional Workspaces",
        description: "Available controls awaiting a category assignment.",
        paths: remaining.map(module => module.href),
        modules: remaining,
      });
    }
    return grouped;
  }, [modules]);

  const matchingCategories = availableCategories.map(category => ({
    ...category,
    modules: category.modules.filter(module => {
      const searchable = [
        category.title,
        category.description,
        module.title,
        module.description,
        module.group,
        module.href,
      ].join(" ").toLowerCase();
      return normalizedQuery.split(/\s+/).every(word => searchable.includes(word));
    }),
  })).filter(category => category.modules.length > 0);

  const resultCount = matchingCategories.reduce(
    (total, category) => total + category.modules.length, 0
  );

  return (
    <div className={styles.explorer}>
      <div className={styles.toolbar}>
        <div>
          <strong>Choose a category to see its controls</strong>
          <p>
            {availableCategories.length} categories · {modules.length} workspaces
            available for your role. Existing access rules still apply.
          </p>
        </div>
        <label className={styles.search}>
          <span>Search all admin controls</span>
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Try verification, inventory, subscriptions or master data"
          />
        </label>
      </div>

      {normalizedQuery ? (
        <div className={styles.results}>
          <div className={styles.resultHeading}>
            <strong role="status">{resultCount} matching workspaces</strong>
            <button type="button" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
          {matchingCategories.map(category => (
            <section key={category.id} className={styles.resultGroup}>
              <h3>{category.title}</h3>
              <WorkspaceLinks modules={category.modules} />
            </section>
          ))}
          {!resultCount && (
            <p>No matching controls. Try another word or clear the search.</p>
          )}
        </div>
      ) : (
        <div className={styles.categories}>
          {availableCategories.map(category => {
            const expanded = openCategory === category.id;
            const buttonId = instanceId + "-" + category.id + "-button";
            const panelId = instanceId + "-" + category.id + "-panel";

            return (
              <section key={category.id}
                className={`${styles.category} ${expanded ? styles.expanded : ""}`}>
                <h3 className={styles.categoryHeading}>
                  <button
                    id={buttonId}
                    type="button"
                    className={styles.categoryButton}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpenCategory(expanded ? null : category.id)}
                  >
                    <span className={styles.categoryText}>
                      <strong>{category.title}</strong>
                      <span>{category.description}</span>
                    </span>
                    <span className={styles.categoryMeta}>
                      <span>{category.modules.length} controls</span>
                      <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!expanded}
                  className={styles.categoryBody}
                >
                  <WorkspaceLinks modules={category.modules} />
                </div>
              </section>
            );
          })}
          {!availableCategories.length && (
            <p>No workspaces are currently available for your role.</p>
          )}
        </div>
      )}
    </div>
  );
}

function WorkspaceLinks({ modules }: { modules: CommandModule[] }) {
  return (
    <div className={styles.workspaces}>
      {modules.map(module => (
        <Link key={module.href} href={module.href} className={styles.workspace}>
          <strong>{module.title}</strong>
          <span>{module.description}</span>
          <b>Open workspace <span aria-hidden="true">→</span></b>
        </Link>
      ))}
    </div>
  );
}
