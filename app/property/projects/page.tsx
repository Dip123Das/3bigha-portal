// app/property/projects/page.tsx  (PUBLIC)
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabasePublicBrowser } from "@/lib/supabasePublicBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type ProjectStatus = "draft" | "active" | "paused" | "completed" | "blocked" | string;

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  status: ProjectStatus | null;
  updated_at: string | null;
};

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusLabel(s?: ProjectStatus | null) {
  if (s === "active") return "Active";
  if (s === "paused") return "Paused";
  if (s === "completed") return "Completed";
  if (s === "blocked") return "Blocked";
  if (s === "draft") return "Draft";
  return s || "—";
}

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}

export default function PropertyProjectsPublicPage() {
  const supabase: any = useMemo(() => {
    const factory: any = getSupabasePublicBrowser as any;
    return factory();
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  useEffect(() => {
    let alive = true;

    async function loadProjects() {
      setLoading(true);
      setErr(null);

      try {
        const res = await supabase
          .from("builder_projects")
          .select("id,name,slug,city,district,state,pincode,status,updated_at")
          .eq("status", "active")
          .order("name", { ascending: true });

        if (!alive) return;

        if (res.error) throw res.error;

        setProjects((res.data ?? []) as ProjectRow[]);
      } catch (e: any) {
        if (!alive) return;
        setProjects([]);
        setErr(friendlyDbError(e));
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProjects();

    return () => {
      alive = false;
    };
  }, [supabase]);

  return (
    <Container>
      <SectionHeader title="Projects" subtitle="Public builder projects" />

      {err ? (
        <EmptyState message={err} />
      ) : loading ? (
        <EmptyState message="Loading projects…" />
      ) : projects.length === 0 ? (
        <EmptyState message="No public active builder projects are available right now." />
      ) : (
        <Grid>
          {projects.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <Badge>{statusLabel(p.status)}</Badge>
                  <Badge>Updated: {fmt(p.updated_at)}</Badge>
                </div>

                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
                  {p.name}
                </div>

                <div style={{ opacity: 0.8, fontSize: 13, marginBottom: 10 }}>
                  {p.city ?? "—"}
                  {p.district ? `, ${p.district}` : ""}
                  {p.state ? `, ${p.state}` : ""}
                  {p.pincode ? ` — ${p.pincode}` : ""}
                </div>

                <Link
                  href={`/property/projects/${encodeURIComponent(p.slug)}`}
                  style={{ fontWeight: 900, textDecoration: "none" }}
                >
                  View Project →
                </Link>
              </CardBody>
            </Card>
          ))}
        </Grid>
      )}
    </Container>
  );
}