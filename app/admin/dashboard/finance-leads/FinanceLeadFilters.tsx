"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Lead = {
  id: string;

  name?: string | null;
  phone?: string | null;

  loan_purpose?: string | null;

  priority?: string | null;
  status?: string | null;

  preferred_bank?: string | null;

  sanction_probability?: number | null;
  lead_score?: number | null;

  created_at?: string | null;
};

function getPriorityColor(priority?: string | null) {
  if (priority === "high") {
    return "bg-red-100 text-red-700";
  }

  if (priority === "follow_up") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-blue-100 text-blue-700";
}

export default function FinanceLeadFilters({
  leads,
}: {
  leads: Lead[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !search ||
        lead.name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        lead.phone
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        lead.preferred_bank
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  return (
    <div className="mt-5">
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Search borrower / mobile / bank"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="rounded-2xl border px-4 py-3 text-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            className="rounded-2xl border px-4 py-3 text-sm"
          >
            <option value="all">
              All Status
            </option>

            <option value="new">
              New
            </option>

            <option value="contacted">
              Contacted
            </option>

            <option value="documents_pending">
              Documents Pending
            </option>

            <option value="under_review">
              Under Review
            </option>

            <option value="sanction_possible">
              Sanction Possible
            </option>

            <option value="converted">
              Converted
            </option>

            <option value="rejected">
              Rejected
            </option>
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1000px] w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Borrower
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Purpose
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Score
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Sanction
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Priority
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Status
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Bank
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-t"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/dashboard/finance-leads/${lead.id}`}
                      className="font-bold text-slate-900 hover:text-blue-600"
                    >
                      {lead.name || "Unnamed"}
                    </Link>

                    <div className="text-xs text-slate-500">
                      {lead.phone || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm capitalize text-slate-700">
                    {lead.loan_purpose || "home"}
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-900">
                    {lead.lead_score || 0}/100
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-emerald-700">
                    {lead.sanction_probability || 0}%
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${getPriorityColor(
                        lead.priority
                      )}`}
                    >
                      {lead.priority || "normal"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {lead.status || "new"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    {lead.preferred_bank ||
                      "Best match"}
                  </td>
                </tr>
              ))}

              {!filteredLeads.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No finance leads found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}