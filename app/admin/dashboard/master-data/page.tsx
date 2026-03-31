// app/admin/dashboard/master-data/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";

function isMaster(role: string | null | undefined) {
  return role === "master_admin";
}

async function requireMasterAdmin(supabase: ReturnType<typeof getSupabaseBrowser>) {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return { ok: false, role: null, email: null };

  const email = session.user.email ?? null;
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
  const role = (prof as any)?.role ?? null;

  return { ok: isMaster(role), role, email };
}

function CardShell(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="md-card">
      <div className="md-cardHead">
        <div className="md-title">{props.title}</div>
      </div>
      <div className="md-cardBody">{props.children}</div>
    </div>
  );
}

function SegmentedToggle(props: {
  taxonomyHref: string;
  attributesHref: string;
  valuesHref?: string;
  mappingHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isTaxonomy = pathname === props.taxonomyHref || pathname.startsWith(props.taxonomyHref + "/");
  const isAttributes = pathname === props.attributesHref || pathname.startsWith(props.attributesHref + "/");
  const isValues = props.valuesHref ? pathname === props.valuesHref || pathname.startsWith(props.valuesHref + "/") : false;
  const isMapping = props.mappingHref ? pathname === props.mappingHref || pathname.startsWith(props.mappingHref + "/") : false;

  const hasExtra = !!props.valuesHref || !!props.mappingHref;

  return (
    <div
      className={`segWrap ${hasExtra ? "four" : "two"}`}
      role="group"
      aria-label="Master data section"
    >
      <button
        type="button"
        className={`segBtn ${isTaxonomy ? "active" : ""}`}
        onClick={() => router.push(props.taxonomyHref)}
      >
        Taxonomy
      </button>

      <button
        type="button"
        className={`segBtn ${isAttributes ? "active" : ""}`}
        onClick={() => router.push(props.attributesHref)}
      >
        Attributes
      </button>

      {props.valuesHref ? (
        <button
          type="button"
          className={`segBtn ${isValues ? "active" : ""}`}
          onClick={() => router.push(props.valuesHref!)}
        >
          Values
        </button>
      ) : null}

      {props.mappingHref ? (
        <button
          type="button"
          className={`segBtn ${isMapping ? "active" : ""}`}
          onClick={() => router.push(props.mappingHref!)}
        >
          Mapping
        </button>
      ) : null}
    </div>
  );
}

export default function MasterDataEntryCentrePage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const a = await requireMasterAdmin(supabase);
      if (!alive) return;

      if (!a.ok) {
        router.replace("/admin/dashboard");
        return;
      }

      setEmail(a.email);
      setRole(a.role);
      setAllowed(true);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Master Data Entry Centre" subtitle="Loading…" />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <SectionHeader title="Master Data Entry Centre" subtitle="Access denied" />
        <EmptyState message="master_admin access required." />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader
        title="Master Data Entry Centre"
        subtitle="Manage taxonomy + attributes from one place (Supabase-backed)."
      />

      <div className="md-top">
        <ActionButton href="/admin/dashboard" variant="secondary">
          ← Back to Admin Dashboard
        </ActionButton>

        <div className="md-pills">
          <span>{email ?? "—"}</span>
          <span>role: {role ?? "—"}</span>
        </div>
      </div>

      <div className="md-grid">
        <CardShell title="Property · Master Data">
          <SegmentedToggle
  taxonomyHref="/admin/dashboard/master-data/property/taxonomy"
  attributesHref="/admin/dashboard/master-data/property/attributes"
  valuesHref="/admin/dashboard/master-data/property/values"
  mappingHref="/admin/dashboard/master-data/property/mapping"
/>
        </CardShell>

        <CardShell title="Materials · Master Data">
          <SegmentedToggle
            taxonomyHref="/admin/dashboard/master-data/materials/taxonomy"
            attributesHref="/admin/dashboard/master-data/materials/attributes"
          />
        </CardShell>

        <CardShell title="Services · Master Data">
          <SegmentedToggle
            taxonomyHref="/admin/dashboard/master-data/services/taxonomy"
            attributesHref="/admin/dashboard/master-data/services/attributes"
          />
        </CardShell>

        <CardShell title="Rentals · Master Data">
          <SegmentedToggle
            taxonomyHref="/admin/dashboard/master-data/rentals/taxonomy"
            attributesHref="/admin/dashboard/master-data/rentals/attributes"
          />
        </CardShell>
      </div>

      <style jsx>{`
        .md-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 12px 0 18px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .md-pills {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }

        .md-pills span {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 999px;
          font-size: 12px;
          background: #fff;
          white-space: nowrap;
        }

        .md-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .md-card {
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 14px;
          overflow: hidden;
        }

        .md-cardHead {
          padding: 14px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .md-title {
          font-weight: 900;
          font-size: 15px;
        }

        .md-cardBody {
          padding: 14px;
        }

        .segWrap {
          width: 100%;
          max-width: 360px;

          display: grid;
.segWrap.two {
  grid-template-columns: 1fr 1fr;
}

.segWrap.four {
  grid-template-columns: 1fr 1fr;
}
          gap: 6px;

          padding: 6px;
          border-radius: 999px;

          border: 2px solid rgba(11, 94, 215, 0.35);
          background: rgba(11, 94, 215, 0.08);
        }

        .segBtn {
          height: 44px;
          border-radius: 999px;

          border: 2px solid transparent;
          background: transparent;

          color: #0b5ed7;
          font-weight: 900;
          font-size: 14px;

          cursor: pointer;
          transition: transform 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
        }

        .segBtn:hover {
          background: rgba(11, 94, 215, 0.12);
          transform: translateY(-1px);
        }

        .segBtn.active {
          background: #0b5ed7;
          color: #fff;
          box-shadow: 0 10px 18px rgba(11, 94, 215, 0.25);
        }

        .segBtn:active {
          transform: translateY(0);
        }

        .segBtn:focus {
          outline: none;
          box-shadow: 0 0 0 4px rgba(11, 94, 215, 0.22);
        }
      `}</style>
    </Container>
  );
}
