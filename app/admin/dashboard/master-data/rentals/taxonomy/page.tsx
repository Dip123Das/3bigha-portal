"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type Kind =
  | "type"
  | "category"
  | "subcategory"
  | "product_group";

type Mode = "browse" | "add" | "edit";

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: Kind;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  source: string | null;
  child_count: number;
  active_child_count: number;
  descendant_count: number;
  mapping_count: number;
  direct_listing_count: number;
};

type Summary = {
  total_taxons: number;
  active_taxons: number;
  inactive_taxons: number;
  type_count: number;
  category_count: number;
  subcategory_count: number;
  product_group_count: number;
  legacy_listing_count: number;
  legacy_category_count: number;
  legacy_subcategory_count: number;
  legacy_equipment_count: number;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  sort_order: "1000",
  is_active: true,
};

const levelNames: Record<Kind, string> = {
  type: "Type",
  category: "Category",
  subcategory: "Subcategory",
  product_group: "Product Group",
};

const childKind: Partial<Record<Kind, Kind>> = {
  type: "category",
  category: "subcategory",
  subcategory: "product_group",
};

const panel: React.CSSProperties = {
  border: "1px solid rgba(15,23,42,0.10)",
  borderRadius: 14,
  padding: 16,
  background: "#fff",
};

const field: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  border: "1px solid rgba(15,23,42,0.16)",
  borderRadius: 10,
  padding: "10px 12px",
  background: "#fff",
};

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function sortTaxons(rows: TaxonRow[]) {
  return [...rows].sort(
    (left, right) =>
      (left.sort_order ?? 1000000) -
        (right.sort_order ?? 1000000) ||
      left.name.localeCompare(right.name)
  );
}

export default function RentalTaxonomyMasterPage() {
  const router = useRouter();
  const supabase = useMemo(
    () => getSupabaseBrowser(),
    []
  );
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [taxons, setTaxons] = useState<TaxonRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(
    null
  );

  const [selectedTypeId, setSelectedTypeId] =
    useState("");
  const [selectedCategoryId, setSelectedCategoryId] =
    useState("");
  const [
    selectedSubcategoryId,
    setSelectedSubcategoryId,
  ] = useState("");

  const [viewKind, setViewKind] =
    useState<Kind>("type");
  const [mode, setMode] = useState<Mode>("browse");
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [editingKind, setEditingKind] =
    useState<Kind>("type");
  const [permanentSlug, setPermanentSlug] =
    useState("");
  const [permanentParent, setPermanentParent] =
    useState("");
  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [aiBusy, setAiBusy] = useState<
    "names" | "description" | null
  >(null);
  const [aiMessage, setAiMessage] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<
    string[]
  >([]);

  const types = useMemo(
    () =>
      sortTaxons(
        taxons.filter((row) => row.kind === "type")
      ),
    [taxons]
  );

  const categories = useMemo(
    () =>
      sortTaxons(
        taxons.filter(
          (row) =>
            row.kind === "category" &&
            row.parent_id === selectedTypeId
        )
      ),
    [taxons, selectedTypeId]
  );

  const subcategories = useMemo(
    () =>
      sortTaxons(
        taxons.filter(
          (row) =>
            row.kind === "subcategory" &&
            row.parent_id === selectedCategoryId
        )
      ),
    [taxons, selectedCategoryId]
  );

  const productGroups = useMemo(
    () =>
      sortTaxons(
        taxons.filter(
          (row) =>
            row.kind === "product_group" &&
            row.parent_id === selectedSubcategoryId
        )
      ),
    [taxons, selectedSubcategoryId]
  );

  const selectedType =
    types.find((row) => row.id === selectedTypeId) ||
    null;

  const selectedCategory =
    categories.find(
      (row) => row.id === selectedCategoryId
    ) || null;

  const selectedSubcategory =
    subcategories.find(
      (row) => row.id === selectedSubcategoryId
    ) || null;

  const visibleRows = useMemo(() => {
    if (viewKind === "type") return types;
    if (viewKind === "category") return categories;
    if (viewKind === "subcategory") {
      return subcategories;
    }
    return productGroups;
  }, [
    viewKind,
    types,
    categories,
    subcategories,
    productGroups,
  ]);

  async function accessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function requestApi(
    method: "GET" | "POST" | "PATCH",
    body?: Record<string, unknown>
  ) {
    const token = await accessToken();

    if (!token) {
      router.replace("/admin/dashboard");
      throw new Error("Please sign in again.");
    }

    const response = await fetch(
      "/api/admin/rental-taxonomy",
      {
        method,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          ...(body
            ? { "Content-Type": "application/json" }
            : {}),
          Authorization: `Bearer ${token}`,
        },
        ...(body
          ? { body: JSON.stringify(body) }
          : {}),
      }
    );

    const result = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      if (
        response.status === 401 ||
        response.status === 403
      ) {
        router.replace("/admin/dashboard");
      }

      throw new Error(
        result.error ||
          "Rental Taxonomy request failed."
      );
    }

    return result;
  }

  async function load() {
    setLoading(true);
    setError("");

    try {
      const result = await requestApi("GET");
      const nextTaxons =
        (result.taxons || []) as TaxonRow[];

      setTaxons(nextTaxons);
      setSummary((result.summary || null) as Summary | null);

      setSelectedTypeId((current) => {
        if (
          nextTaxons.some(
            (row) =>
              row.id === current &&
              row.kind === "type"
          )
        ) {
          return current;
        }

        return (
          nextTaxons.find(
            (row) =>
              row.kind === "type" && row.is_active
          )?.id ||
          nextTaxons.find(
            (row) => row.kind === "type"
          )?.id ||
          ""
        );
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load Rental Taxonomy."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      selectedCategoryId &&
      !categories.some(
        (row) => row.id === selectedCategoryId
      )
    ) {
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (
      selectedSubcategoryId &&
      !subcategories.some(
        (row) => row.id === selectedSubcategoryId
      )
    ) {
      setSelectedSubcategoryId("");
    }
  }, [subcategories, selectedSubcategoryId]);

  function parentForKind(kind: Kind) {
    if (kind === "category") return selectedType;
    if (kind === "subcategory") {
      return selectedCategory;
    }
    if (kind === "product_group") {
      return selectedSubcategory;
    }
    return null;
  }

  function parentIdForKind(kind: Kind) {
    return parentForKind(kind)?.id || null;
  }

  function parentPathForKind(kind: Kind) {
    const parts: string[] = [];

    if (
      kind === "category" ||
      kind === "subcategory" ||
      kind === "product_group"
    ) {
      if (selectedType) parts.push(selectedType.name);
    }

    if (
      kind === "subcategory" ||
      kind === "product_group"
    ) {
      if (selectedCategory) {
        parts.push(selectedCategory.name);
      }
    }

    if (kind === "product_group") {
      if (selectedSubcategory) {
        parts.push(selectedSubcategory.name);
      }
    }

    return parts.join(" → ");
  }

  function showEditor() {
    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      editorRef.current
        ?.querySelector<HTMLInputElement>("input")
        ?.focus();
    }, 0);
  }

  function resetEditor() {
    setMode("browse");
    setEditingId(null);
    setEditingKind("type");
    setPermanentSlug("");
    setPermanentParent("");
    setForm(emptyForm);
    setAiBusy(null);
    setAiMessage("");
    setAiSuggestions([]);
  }

  function openAdd(kind: Kind) {
    const parent = parentForKind(kind);

    if (kind !== "type" && !parent) {
      setError(
        `Select the parent ${levelNames[
          kind === "category"
            ? "type"
            : kind === "subcategory"
              ? "category"
              : "subcategory"
        ].toLowerCase()} first.`
      );
      return;
    }

    setError("");
    setMessage("");
    setAiMessage("");
    setAiSuggestions([]);
    setMode("add");
    setEditingId(null);
    setEditingKind(kind);
    setPermanentSlug("");
    setPermanentParent(parentPathForKind(kind));
    setForm(emptyForm);
    showEditor();
  }

  function openEdit(row: TaxonRow) {
    setError("");
    setMessage("");
    setAiMessage("");
    setAiSuggestions([]);
    setMode("edit");
    setEditingId(row.id);
    setEditingKind(row.kind);
    setPermanentSlug(row.slug);

    const parent = row.parent_id
      ? taxons.find(
          (candidate) =>
            candidate.id === row.parent_id
        )
      : null;

    setPermanentParent(parent?.name || "Top level");
    setForm({
      name: row.name,
      slug: row.slug,
      description: row.description || "",
      sort_order: String(row.sort_order ?? 1000),
      is_active: row.is_active,
    });
    showEditor();
  }

  function drillInto(row: TaxonRow) {
    if (row.kind === "type") {
      setSelectedTypeId(row.id);
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
      setViewKind("category");
    } else if (row.kind === "category") {
      setSelectedCategoryId(row.id);
      setSelectedSubcategoryId("");
      setViewKind("subcategory");
    } else if (row.kind === "subcategory") {
      setSelectedSubcategoryId(row.id);
      setViewKind("product_group");
    }

    resetEditor();
    setError("");
    setMessage("");
  }

  function goToLevel(kind: Kind) {
    setViewKind(kind);

    if (kind === "type") {
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
    } else if (kind === "category") {
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
    } else if (kind === "subcategory") {
      setSelectedSubcategoryId("");
    }

    resetEditor();
  }

  async function requestAi(
    task: "name_suggestions" | "description"
  ) {
    if (aiBusy) return;

    if (
      task === "description" &&
      form.name.trim().length < 3
    ) {
      setAiMessage(
        "Enter or select a clear display name first."
      );
      return;
    }

    const parent = parentForKind(editingKind);

    if (editingKind !== "type" && !parent && mode === "add") {
      setAiMessage(
        "Select the required parent entry first."
      );
      return;
    }

    setAiBusy(
      task === "name_suggestions"
        ? "names"
        : "description"
    );
    setAiMessage("");

    if (task === "name_suggestions") {
      setAiSuggestions([]);
    }

    try {
      const token = await accessToken();

      if (!token) {
        router.replace("/admin/dashboard");
        throw new Error("Please sign in again.");
      }

      const siblingParentId =
        mode === "edit"
          ? taxons.find(
              (row) => row.id === editingId
            )?.parent_id || null
          : parentIdForKind(editingKind);

      const existingNames = taxons
        .filter(
          (row) =>
            row.kind === editingKind &&
            row.parent_id === siblingParentId
        )
        .map((row) => row.name);

      const response = await fetch(
        "/api/admin/master-description",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            task,
            kind: `rental_${editingKind}`,
            context: {
              name: form.name.trim(),
              family:
                mode === "edit"
                  ? permanentParent
                  : parentPathForKind(editingKind),
              key:
                mode === "edit"
                  ? permanentSlug
                  : form.slug,
            },
            existing: form.description,
            existingNames,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ||
            "AI assistance is unavailable."
        );
      }

      if (result.needs_clarification) {
        setAiMessage(
          result.question ||
            "Please make the classification more specific."
        );
        return;
      }

      if (task === "name_suggestions") {
        const suggestions = Array.isArray(
          result.suggestions
        )
          ? result.suggestions
              .filter(
                (value: unknown): value is string =>
                  typeof value === "string"
              )
              .map((value: string) => value.trim())
              .filter(Boolean)
              .slice(0, 5)
          : [];

        if (!suggestions.length) {
          throw new Error(
            "AI did not return usable suggestions."
          );
        }

        setAiSuggestions(suggestions);
        setAiMessage(
          "AI suggestions are advisory. Select one or enter your own name."
        );
      } else if (
        typeof result.description === "string"
      ) {
        setForm((current) => ({
          ...current,
          description: result.description.slice(0, 600),
        }));
        setAiMessage(
          "AI draft inserted. Review and edit it before saving."
        );
      } else {
        throw new Error(
          "AI did not return a usable description."
        );
      }
    } catch (caught) {
      setAiMessage(
        caught instanceof Error
          ? caught.message
          : "AI assistance is unavailable."
      );
    } finally {
      setAiBusy(null);
    }
  }

  function applyAiSuggestion(name: string) {
    setForm((current) => ({
      ...current,
      name,
      ...(mode === "add"
        ? { slug: slugify(name) }
        : {}),
    }));
    setAiSuggestions([]);
    setAiMessage(
      "Suggestion selected. Review it before saving."
    );
  }

  async function save() {
    if (saving) return;

    const name = form.name.trim();

    if (name.length < 2) {
      setError(
        "Enter a clear name containing at least two characters."
      );
      return;
    }

    const parentId =
      mode === "add"
        ? parentIdForKind(editingKind)
        : null;

    if (mode === "add" && editingKind !== "type" && !parentId) {
      setError(
        "Select the required parent taxonomy entry."
      );
      return;
    }

    const reviewLines = [
      `Action: ${mode === "add" ? "Create" : "Update"}`,
      `Level: ${levelNames[editingKind]}`,
      `Name: ${name}`,
      `Permanent key: ${
        mode === "add"
          ? form.slug.trim() || slugify(name)
          : permanentSlug
      }`,
      `Parent: ${
        editingKind === "type"
          ? "Top level"
          : permanentParent ||
            parentPathForKind(editingKind)
      }`,
      `Status: ${
        form.is_active ? "Active" : "Inactive"
      }`,
      "",
      "Please confirm that you reviewed this administrator-controlled record.",
    ];

    if (!window.confirm(reviewLines.join("\n"))) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (mode === "add") {
        await requestApi("POST", {
          kind: editingKind,
          parent_id: parentId,
          name,
          slug:
            form.slug.trim() || slugify(name),
          description: form.description.trim(),
          sort_order: form.sort_order,
          is_active: form.is_active,
        });
      } else {
        await requestApi("PATCH", {
          id: editingId,
          name,
          description: form.description.trim(),
          sort_order: form.sort_order,
          is_active: form.is_active,
        });
      }

      setMessage(
        `${levelNames[editingKind]} ${
          mode === "add" ? "created" : "updated"
        }.`
      );

      resetEditor();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Save failed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: TaxonRow) {
    const action = row.is_active
      ? "Deactivate"
      : "Reactivate";

    const impact = [
      `Direct children: ${row.child_count}`,
      `Active children: ${row.active_child_count}`,
      `All descendants: ${row.descendant_count}`,
      `Attribute mappings: ${row.mapping_count}`,
      `Direct taxonomy-linked listings: ${row.direct_listing_count}`,
      `Legacy listings preserved separately: ${
        summary?.legacy_listing_count || 0
      }`,
    ];

    if (
      !window.confirm(
        `${action} "${row.name}"?\n\n${impact.join(
          "\n"
        )}\n\nNo historical record will be deleted.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await requestApi("PATCH", {
        id: row.id,
        name: row.name,
        description: row.description || "",
        sort_order: String(row.sort_order ?? 1000),
        is_active: !row.is_active,
      });

      setMessage(
        `"${row.name}" is now ${
          row.is_active ? "inactive" : "active"
        }.`
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Lifecycle change failed."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container>
      <SectionHeader
        title="Rentals · Taxonomy"
        subtitle="Control the four-level rental classification used by public filters, pricing intelligence and future attribute mappings."
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <ActionButton
          href="/admin/dashboard/master-data"
          variant="secondary"
        >
          ← Back
        </ActionButton>

        <ActionButton
          href="/admin/dashboard/master-data/rentals/attributes"
          variant="secondary"
        >
          Attributes →
        </ActionButton>

        <ActionButton
          href="/admin/dashboard/master-data/rentals/values"
          variant="secondary"
        >
          Values →
        </ActionButton>

        <ActionButton
          href="/admin/dashboard/master-data/rentals/mapping"
          variant="secondary"
        >
          Mapping →
        </ActionButton>
      </div>

      {summary ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(145px,1fr))",
            gap: 10,
            marginBottom: 14,
          }}
        >
          {[
            ["All taxons", summary.total_taxons],
            ["Active", summary.active_taxons],
            ["Inactive", summary.inactive_taxons],
            ["Types", summary.type_count],
            ["Categories", summary.category_count],
            ["Subcategories", summary.subcategory_count],
            ["Product groups", summary.product_group_count],
            [
              "Legacy listings",
              summary.legacy_listing_count,
            ],
          ].map(([label, value]) => (
            <div key={String(label)} style={panel}>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          ...panel,
          marginBottom: 14,
          background: "#f8fafc",
        }}
      >
        <b>Compatibility protection</b>
        <p style={{ margin: "6px 0 0" }}>
          The existing {summary?.legacy_listing_count || 0}{" "}
          rental listings continue using the preserved legacy
          catalogue of{" "}
          {summary?.legacy_category_count || 0} categories,{" "}
          {summary?.legacy_subcategory_count || 0}{" "}
          subcategories and{" "}
          {summary?.legacy_equipment_count || 0} equipment
          records. Rental Taxonomy administration never deletes
          or rewrites those records.
        </p>
      </div>

      {error ? (
        <div
          style={{
            ...panel,
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {message ? (
        <div
          style={{
            ...panel,
            borderColor: "#bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            marginBottom: 14,
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          ...panel,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => goToLevel("type")}
            style={{
              ...field,
              width: "auto",
              cursor: "pointer",
              fontWeight:
                viewKind === "type" ? 800 : 500,
            }}
          >
            Types
          </button>

          {selectedType ? (
            <>
              <span>→</span>
              <button
                type="button"
                onClick={() => goToLevel("category")}
                style={{
                  ...field,
                  width: "auto",
                  cursor: "pointer",
                  fontWeight:
                    viewKind === "category" ? 800 : 500,
                }}
              >
                {selectedType.name}
              </button>
            </>
          ) : null}

          {selectedCategory ? (
            <>
              <span>→</span>
              <button
                type="button"
                onClick={() =>
                  goToLevel("subcategory")
                }
                style={{
                  ...field,
                  width: "auto",
                  cursor: "pointer",
                  fontWeight:
                    viewKind === "subcategory"
                      ? 800
                      : 500,
                }}
              >
                {selectedCategory.name}
              </button>
            </>
          ) : null}

          {selectedSubcategory ? (
            <>
              <span>→</span>
              <button
                type="button"
                onClick={() =>
                  setViewKind("product_group")
                }
                style={{
                  ...field,
                  width: "auto",
                  cursor: "pointer",
                  fontWeight:
                    viewKind === "product_group"
                      ? 800
                      : 500,
                }}
              >
                {selectedSubcategory.name}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div style={panel}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              {levelNames[viewKind]}s
            </h2>
            <small>
              Active and inactive historical records are shown.
            </small>
          </div>

          <button
            type="button"
            onClick={() => openAdd(viewKind)}
            disabled={
              saving ||
              (viewKind !== "type" &&
                !parentForKind(viewKind))
            }
            style={{
              ...field,
              width: "auto",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            + Add {levelNames[viewKind]}
          </button>
        </div>

        {loading ? (
          <EmptyState message="Loading Rental Taxonomy…" />
        ) : visibleRows.length === 0 ? (
          <EmptyState
            message={`No ${levelNames[
              viewKind
            ].toLowerCase()} records found for this selection.`}
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {visibleRows.map((row) => (
              <div
                key={row.id}
                style={{
                  border:
                    "1px solid rgba(15,23,42,0.10)",
                  borderRadius: 12,
                  padding: 14,
                  background: row.is_active
                    ? "#fff"
                    : "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 280px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <b>{row.name}</b>
                      <Badge>
                        {row.is_active
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                      <Badge>{row.kind}</Badge>
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        color: "#475569",
                        fontSize: 13,
                      }}
                    >
                      Permanent key:{" "}
                      <code>{row.slug}</code>
                    </div>

                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#334155",
                      }}
                    >
                      {row.description ||
                        "No administrator description yet."}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 8,
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      <span>
                        Sort: {row.sort_order ?? "—"}
                      </span>
                      <span>
                        Children: {row.child_count}
                      </span>
                      <span>
                        Active children:{" "}
                        {row.active_child_count}
                      </span>
                      <span>
                        Descendants:{" "}
                        {row.descendant_count}
                      </span>
                      <span>
                        Mappings: {row.mapping_count}
                      </span>
                      <span>
                        Direct listings:{" "}
                        {row.direct_listing_count}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    {childKind[row.kind] ? (
                      <button
                        type="button"
                        onClick={() => drillInto(row)}
                        style={{
                          ...field,
                          width: "auto",
                          cursor: "pointer",
                        }}
                      >
                        Open{" "}
                        {levelNames[
                          childKind[row.kind] as Kind
                        ]}
                        s
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      style={{
                        ...field,
                        width: "auto",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void toggleStatus(row)
                      }
                      disabled={saving}
                      style={{
                        ...field,
                        width: "auto",
                        cursor: "pointer",
                      }}
                    >
                      {row.is_active
                        ? "Deactivate"
                        : "Reactivate"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {mode !== "browse" ? (
        <div
          ref={editorRef}
          style={{
            ...panel,
            marginTop: 14,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {mode === "add" ? "Add" : "Edit"}{" "}
            {levelNames[editingKind]}
          </h2>

          <div
            style={{
              ...panel,
              background: "#fffbeb",
              borderColor: "#fde68a",
              marginBottom: 14,
            }}
          >
            AI may suggest names and draft descriptions, but
            it cannot save database records. A master
            administrator must review and confirm every save.
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(240px,1fr))",
              gap: 12,
            }}
          >
            <label>
              <b>Display name</b>
              <input
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    ...(mode === "add" &&
                    !current.slug
                      ? { slug: slugify(name) }
                      : {}),
                  }));
                }}
                style={field}
                maxLength={120}
              />
            </label>

            <label>
              <b>Permanent key</b>
              <input
                value={
                  mode === "edit"
                    ? permanentSlug
                    : form.slug
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                  }))
                }
                style={{
                  ...field,
                  background:
                    mode === "edit"
                      ? "#f1f5f9"
                      : "#fff",
                }}
                maxLength={120}
                disabled={mode === "edit"}
              />
              <small>
                Locked permanently after creation.
              </small>
            </label>

            <label>
              <b>Parent relationship</b>
              <input
                value={
                  editingKind === "type"
                    ? "Top level"
                    : mode === "edit"
                      ? permanentParent
                      : parentPathForKind(editingKind)
                }
                style={{
                  ...field,
                  background: "#f1f5f9",
                }}
                disabled
              />
              <small>
                Locked permanently after creation.
              </small>
            </label>

            <label>
              <b>Sort order</b>
              <input
                type="number"
                min={0}
                max={1000000}
                value={form.sort_order}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sort_order: event.target.value,
                  }))
                }
                style={field}
              />
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={() =>
                void requestAi("name_suggestions")
              }
              disabled={Boolean(aiBusy)}
              style={{
                ...field,
                width: "auto",
                cursor: "pointer",
              }}
            >
              {aiBusy === "names"
                ? "AI is suggesting…"
                : `Suggest ${levelNames[
                    editingKind
                  ]} Names with AI`}
            </button>
          </div>

          {aiSuggestions.length ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {aiSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() =>
                    applyAiSuggestion(suggestion)
                  }
                  style={{
                    ...field,
                    width: "auto",
                    cursor: "pointer",
                  }}
                >
                  Use “{suggestion}”
                </button>
              ))}
            </div>
          ) : null}

          <label
            style={{
              display: "block",
              marginTop: 14,
            }}
          >
            <b>Administrator description</b>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              maxLength={600}
              rows={5}
              style={{
                ...field,
                resize: "vertical",
              }}
            />
            <small>
              {form.description.length}/600 characters.
              Human review is required.
            </small>
          </label>

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={() =>
                void requestAi("description")
              }
              disabled={Boolean(aiBusy)}
              style={{
                ...field,
                width: "auto",
                cursor: "pointer",
              }}
            >
              {aiBusy === "description"
                ? "AI is drafting…"
                : form.description.trim()
                  ? "Improve Description with AI"
                  : "Draft Description with AI"}
            </button>
          </div>

          {aiMessage ? (
            <p
              style={{
                marginBottom: 0,
                color: "#475569",
              }}
            >
              {aiMessage}
            </p>
          ) : null}

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
            />
            Active
          </label>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              style={{
                ...field,
                width: "auto",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {saving
                ? "Saving…"
                : "Review and Save"}
            </button>

            <button
              type="button"
              onClick={resetEditor}
              disabled={saving}
              style={{
                ...field,
                width: "auto",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </Container>
  );
}
