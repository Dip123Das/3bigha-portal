import Link from "next/link";

import type { ProcurementKnowledgeGraph } from "@/lib/seo/procurement-knowledge-graph";

export default function ProcurementKnowledgeGraphBlock({
  graph,
}: {
  graph: ProcurementKnowledgeGraph;
}) {
  return (
    <section className="mt-8 rounded-2xl border p-5">
      <h2 className="text-xl font-bold">
        AI Procurement Knowledge Graph
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        {graph.summary}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <div className="font-semibold">
            Connected Entities
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {graph.entities.map((entity) =>
              entity.url ? (
                <Link
                  key={entity.id}
                  href={entity.url}
                  className="rounded-full border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  {entity.label}
                </Link>
              ) : (
                <span
                  key={entity.id}
                  className="rounded-full border px-3 py-2 text-sm"
                >
                  {entity.label}
                </span>
              )
            )}
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="font-semibold">
            AI Relationship Signals
          </div>

          <div className="mt-3 space-y-3">
            {graph.relations.slice(0, 5).map((relation) => (
              <div
                key={`${relation.from}-${relation.to}-${relation.relation}`}
                className="rounded-lg border p-3 text-sm text-gray-600"
              >
                {relation.reason}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}