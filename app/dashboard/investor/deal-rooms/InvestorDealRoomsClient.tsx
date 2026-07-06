"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DealRoomRow = {
  id: string;
  opportunity_id: string | null;
  investor_user_id: string | null;
  builder_user_id: string | null;
  stage: string | null;
  created_at: string | null;
  updated_at: string | null;
  investment_opportunities?: {
    id: string;
    title: string | null;
    slug: string | null;
    status: string | null;
  } | null;
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function humanizeStage(stage?: string | null) {
  if (!stage) return "Unknown";
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function InvestorDealRoomsClient() {
  const [rooms, setRooms] = useState<DealRoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          "/api/investment/deal-rooms?role=investor&status=open",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Failed to load deal rooms.");
        }

        if (!active) return;
        setRooms(Array.isArray((json as any)?.data) ? (json as any).data : []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          My Deal Rooms
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Track your active investment discussions with builders.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading deal rooms...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No deal rooms yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Express interest in an investment opportunity to start a discussion.
          </p>
          <div className="mt-4">
            <Link
              href="/investment/opportunities"
              className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Browse Opportunities
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => {
            const title =
              room.investment_opportunities?.title?.trim() ||
              "Untitled Opportunity";

            return (
              <Link
                key={room.id}
                href={`/dashboard/investor/deal-rooms/${room.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="line-clamp-2 text-base font-semibold text-slate-900">
                    {title}
                  </h2>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    {humanizeStage(room.stage)}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>
                    Last activity: {fmtDate(room.updated_at || room.created_at)}
                  </p>
                  <p>
                    Status:{" "}
                    {room.investment_opportunities?.status || "Unknown"}
                  </p>
                </div>

                <div className="mt-4 text-sm font-medium text-slate-900 group-hover:underline">
                  Open Deal Room
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}