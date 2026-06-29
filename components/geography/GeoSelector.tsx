"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { resolveGeography } from "@/lib/geography/resolver";
import { getNationalGeoHierarchy } from "@/lib/geography/nationalHierarchy";

type GeoOption = {
  id: string;
  name: string;
  slug?: string | null;
  state_id?: string | null;
  district_id?: string | null;
  subdivision_id?: string | null;
  block_id?: string | null;
  pincode?: string | null;
  place_type?: string | null;
};

export type GeoSelection = {
  state?: GeoOption | null;
  district?: GeoOption | null;
  subdivision?: GeoOption | null;
  block?: GeoOption | null;
  place?: GeoOption | null;
};

type GeoSelectorProps = {
  value?: GeoSelection;
  onChange: (selection: GeoSelection) => void;
  includeSubdivision?: boolean;
  includeBlock?: boolean;
  includePlace?: boolean;
  disabled?: boolean;
};

type GeoType =
  | "states"
  | "districts"
  | "subdivisions"
  | "blocks"
  | "villages"
  | "localBodies"
  | "wards"
  | "places";

type GeoParams = {
  stateId?: string;
  districtId?: string;
  subdivisionId?: string;
  blockId?: string;
  localBodyId?: string;
  q?: string;
  offset?: number;
  limit?: number;
};

type GeoApiResponse = {
  options: GeoOption[];
  hasMore?: boolean;
  nextOffset?: number;
};

const optionCache = new Map<string, GeoApiResponse>();

function cacheKey(type: GeoType, params: GeoParams) {
  return JSON.stringify({
    type,
    stateId: params.stateId || "",
    districtId: params.districtId || "",
    subdivisionId: params.subdivisionId || "",
    blockId: params.blockId || "",
    localBodyId: params.localBodyId || "",
    q: params.q || "",
    offset: params.offset || 0,
    limit: params.limit || 50,
  });
}

async function loadOptions(
  type: GeoType,
  params: GeoParams,
  signal?: AbortSignal
): Promise<GeoApiResponse> {
  const merged = { limit: 50, offset: 0, ...params };
  const key = cacheKey(type, merged);
  const cached = optionCache.get(key);

  if (cached) return cached;

  const url = new URL("/api/geography/options", window.location.origin);
  url.searchParams.set("type", type);

  if (merged.stateId) url.searchParams.set("stateId", merged.stateId);
  if (merged.districtId) url.searchParams.set("districtId", merged.districtId);
  if (merged.subdivisionId) url.searchParams.set("subdivisionId", merged.subdivisionId);
  if (merged.blockId) url.searchParams.set("blockId", merged.blockId);
  if (merged.localBodyId) url.searchParams.set("localBodyId", merged.localBodyId);
  if (merged.q) url.searchParams.set("q", merged.q);
  url.searchParams.set("limit", String(merged.limit));
  url.searchParams.set("offset", String(merged.offset));

  const res = await fetch(url.toString(), { cache: "no-store", signal });
  const json = await res.json();

  const response: GeoApiResponse = {
    options: Array.isArray(json.options) ? json.options : [],
    hasMore: Boolean(json.hasMore),
    nextOffset:
      typeof json.nextOffset === "number" ? json.nextOffset : undefined,
  };

  optionCache.set(key, response);
  return response;
}

function optionMeta(option: GeoOption) {
  const parts = [
    option.place_type,
    option.pincode ? `PIN ${option.pincode}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function SearchableGeoSelect({
  type,
  label,
  placeholder,
  value,
  disabled,
  params,
  onChange,
}: {
  type: GeoType;
  label: string;
  placeholder: string;
  value?: GeoOption | null;
  disabled?: boolean;
  params?: GeoParams;
  onChange: (option: GeoOption | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<GeoOption[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const parentKey = JSON.stringify(params || {});
  const displayValue = open ? query : value?.name || "";

  async function fetchPage(reset: boolean, q = query) {
    if (disabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const nextOffset = reset ? 0 : offset;

    try {
      setLoading(true);

      const result = await loadOptions(
        type,
        {
          ...(params || {}),
          q,
          offset: nextOffset,
          limit: 50,
        },
        controller.signal
      );

      setOptions((prev) =>
        reset ? result.options : [...prev, ...result.options]
      );
      setOffset(result.nextOffset ?? nextOffset + result.options.length);
      setHasMore(Boolean(result.hasMore));
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        setOptions([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setQuery("");
    setOptions([]);
    setOffset(0);
    setHasMore(false);
  }, [type, parentKey]);

  useEffect(() => {
    if (!open || disabled) return;

    const timer = window.setTimeout(() => {
      fetchPage(true, query);
    }, 180);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, type, parentKey, disabled]);

  function selectOption(option: GeoOption | null) {
    onChange(option);
    setOpen(false);
    setQuery("");
    setOptions([]);
  }

  return (
    <div className="geoSearchField" style={{ position: "relative", minWidth: 0 }}>
      <label>{label}</label>

      <div style={{ position: "relative", width: "100%" }}>
        <input
          value={displayValue}
          disabled={disabled}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
            onChange(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
              setOptions([]);
            }
          }}
        />

        {value ? (
          <button
            type="button"
            className="geoSearchClear"
            disabled={disabled}
            onClick={() => selectOption(null)}
            aria-label={`Clear ${label}`}
          >
            ×
          </button>
        ) : null}
      </div>

      {open && !disabled ? (
        <div
          role="listbox"
          style={{
            marginTop: 6,
            width: "100%",
            maxHeight: 260,
            overflowY: "auto",
            padding: 8,
            borderRadius: 14,
            border: "1px solid rgba(15, 23, 42, 0.12)",
            background: "#ffffff",
            boxShadow: "0 18px 38px rgba(15, 23, 42, 0.14)",
          }}
        >
          {options.map((option) => (
            <div
              key={option.id}
              role="option"
              aria-selected={value?.id === option.id}
              tabIndex={0}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                cursor: "pointer",
                color: "#0f172a",
                background:
                  value?.id === option.id ? "#ecfdf5" : "transparent",
              }}
            >
              <div style={{ display: "block", fontSize: 13, fontWeight: 900 }}>
                {option.name}
              </div>
              {optionMeta(option) ? (
                <div
                  style={{
                    display: "block",
                    marginTop: 2,
                    color: "#64748b",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {optionMeta(option)}
                </div>
              ) : null}
            </div>
          ))}

          {!loading && options.length === 0 ? (
            <div className="geoEmpty">No result found</div>
          ) : null}

          {loading ? <div className="geoEmpty">Loading...</div> : null}

          {hasMore && !loading ? (
            <button
              type="button"
              className="geoLoadMore"
              onClick={() => fetchPage(false)}
            >
              Load more locations
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function GeoSelector({
  value,
  onChange,
  includeSubdivision = true,
  includeBlock = true,
  includePlace = true,
  disabled = false,
}: GeoSelectorProps) {
  const [internalSelection, setInternalSelection] = useState<GeoSelection>({});

  const selection = useMemo<GeoSelection>(
    () => value || internalSelection,
    [value, internalSelection]
  );

  function updateSelection(nextSelection: GeoSelection) {
    if (!value) {
      setInternalSelection(nextSelection);
    }

    onChange(nextSelection);
  }

  const resolved = resolveGeography(selection);
  const hierarchy = getNationalGeoHierarchy(selection.state?.slug || undefined);
  const selectedParts = [
    ...resolved.displayPath,
    resolved.pincode ? `PIN ${resolved.pincode}` : "",
  ].filter(Boolean);

  const [geoMode, setGeoMode] = useState<"rural" | "urban">("rural");

  return (
    <div className="geoSelectorCard">
      <div className="geoSelectorHead">
        <strong>📍 Select Location</strong>
        <small>
          Search national geography by administrative hierarchy, place, village, ward or PIN
        </small>
      </div>

      <div className="geoSelectorGrid">
        <SearchableGeoSelect
          type="states"
          label="State"
          placeholder="Search state"
          value={selection.state}
          disabled={disabled}
          onChange={(state) =>
            updateSelection({
              state,
              district: null,
              subdivision: null,
              block: null,
              place: null,
            })
          }
        />

        <SearchableGeoSelect
          type="districts"
          label="District"
          placeholder={selection.state ? "Search district" : "Select state first"}
          value={selection.district}
          disabled={disabled || !selection.state}
          params={{ stateId: selection.state?.id }}
          onChange={(district) =>
            updateSelection({
              ...selection,
              district,
              subdivision: null,
              block: null,
              place: null,
            })
          }
        />

        <div className="geoModeSwitch">
          <button
            type="button"
            className={geoMode === "rural" ? "active" : ""}
            onClick={() => {
              setGeoMode("rural");
              updateSelection({ ...selection, block: null, place: null });
            }}
            disabled={disabled || !selection.district}
          >
            🌾 Rural
          </button>
          <button
            type="button"
            className={geoMode === "urban" ? "active" : ""}
            onClick={() => {
              setGeoMode("urban");
              updateSelection({ ...selection, subdivision: null, block: null, place: null });
            }}
            disabled={disabled || !selection.district}
          >
            🏙 Urban
          </button>
        </div>

        {geoMode === "rural" ? (
          <>
            {includeSubdivision ? (
              <SearchableGeoSelect
                type="subdivisions"
                label="Sub District / Tehsil / Taluk"
                placeholder={selection.district ? "Search sub district" : "Select district first"}
                value={selection.subdivision}
                disabled={disabled || !selection.district}
                params={{ districtId: selection.district?.id }}
                onChange={(subdivision) =>
                  updateSelection({
                    ...selection,
                    subdivision,
                    block: null,
                    place: null,
                  })
                }
              />
            ) : null}

            {includeBlock ? (
              <SearchableGeoSelect
                type="blocks"
                label="Development Block"
                placeholder={selection.district ? "Search development block" : "Select district first"}
                value={selection.block}
                disabled={disabled || !selection.district}
                params={{ districtId: selection.district?.id }}
                onChange={(block) =>
                  updateSelection({
                    ...selection,
                    block,
                    place: null,
                  })
                }
              />
            ) : null}

            {includePlace ? (
              <div className="geoSelectorPlaceSearch">
                <SearchableGeoSelect
                  type="villages"
                  label="Village"
                  placeholder={selection.district ? "Search village" : "Select district first"}
                  value={selection.place}
                  disabled={disabled || !selection.district}
                  params={{
                    districtId: selection.district?.id,
                    subdivisionId: selection.subdivision?.id,
                    blockId: selection.block?.id,
                  }}
                  onChange={(place) =>
                    updateSelection({
                      ...selection,
                      place,
                    })
                  }
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            {includeBlock ? (
              <SearchableGeoSelect
                type="localBodies"
                label="Urban Local Body / Municipality"
                placeholder={selection.district ? "Search municipality or corporation" : "Select district first"}
                value={selection.block}
                disabled={disabled || !selection.district}
                params={{ districtId: selection.district?.id }}
                onChange={(block) =>
                  updateSelection({
                    ...selection,
                    block,
                    place: null,
                  })
                }
              />
            ) : null}

            {includePlace ? (
              <div className="geoSelectorPlaceSearch">
                <SearchableGeoSelect
                  type="wards"
                  label="Ward"
                  placeholder={selection.block ? "Search ward" : "Select urban local body first"}
                  value={selection.place}
                  disabled={disabled || !selection.block}
                  params={{ localBodyId: selection.block?.id }}
                  onChange={(place) =>
                    updateSelection({
                      ...selection,
                      place,
                    })
                  }
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="geoSelectionPreview">
        <strong>Selected hierarchy</strong>
        <span>{selectedParts.length ? selectedParts.join(" → ") : "No location selected yet"}</span>
      </div>

      <style jsx global>{`

        .geoModeSwitch {
          grid-column: 1 / -1;
          display: inline-flex;
          gap: 8px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(16, 185, 129, 0.16);
          border-radius: 999px;
          width: fit-content;
        }

        .geoModeSwitch button {
          border: 0;
          border-radius: 999px;
          padding: 8px 14px;
          font-weight: 800;
          background: transparent;
          color: #334155;
          cursor: pointer;
        }

        .geoModeSwitch button.active {
          background: #0f172a;
          color: #ffffff;
        }

        .geoModeSwitch button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .geoSelectorCard {
          margin-top: 14px;
          border: 1px solid rgba(16, 185, 129, 0.18);
          background:
            radial-gradient(circle at 12% 10%, rgba(16, 185, 129, 0.14), transparent 34%),
            linear-gradient(180deg, #ffffff, #f0fdf4);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .geoSelectorHead {
          display: grid;
          gap: 3px;
          margin-bottom: 12px;
        }

        .geoSelectorHead strong {
          color: #0f172a;
          font-size: 14px;
          font-weight: 1000;
        }

        .geoSelectorHead small {
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
        }

        .geoSelectorGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .geoSelectorPlaceSearch {
          grid-column: 1 / -1;
        }

        .geoSearchField {
          position: relative;
          display: grid;
          gap: 6px;
        }

        .geoSearchField label {
          color: #334155;
          font-size: 12px;
          font-weight: 900;
        }

        .geoSearchCombo {
          position: relative;
        }

        .geoSearchCombo input {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #ffffff;
          color: #0f172a;
          padding: 0 44px 0 14px;
          font-size: 14px;
          font-weight: 900;
          outline: none;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
        }

        .geoSearchCombo input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
        }

        .geoSearchCombo input:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .geoSearchCombo .geoSearchClear {
          position: absolute;
          top: 9px;
          right: 9px;
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 999px;
          background: #e2e8f0;
          color: #0f172a;
          font-size: 20px;
          font-weight: 900;
          cursor: pointer;
        }

        .geoSearchMenu {
          position: absolute;
          z-index: 40;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          max-height: 280px;
          overflow: auto;
          padding: 8px;
          border-radius: 16px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #ffffff;
          box-shadow: 0 20px 44px rgba(15, 23, 42, 0.16);
        }

        .geoSearchMenu button {
          position: static;
          width: 100%;
          min-height: 42px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 2px;
          padding: 10px 12px;
          border: 0;
          border-radius: 12px;
          background: transparent;
          text-align: left;
          color: #0f172a;
          cursor: pointer;
          white-space: normal;
        }

        .geoSearchMenu button:hover,
        .geoSearchMenu button.active {
          background: #ecfdf5;
        }

        .geoSearchMenu button strong {
          font-size: 13px;
          font-weight: 900;
        }

        .geoSearchMenu button small {
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
        }

        .geoEmpty {
          padding: 12px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
        }

        .geoLoadMore {
          margin-top: 6px;
          border: 1px solid #bbf7d0 !important;
          background: #f0fdf4 !important;
          color: #047857 !important;
          text-align: center !important;
          font-weight: 900;
        }

        .geoSelectionPreview {
          margin-top: 12px;
          display: grid;
          gap: 4px;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.75);
        }

        .geoSelectionPreview strong {
          color: #0f172a;
          font-size: 12px;
          font-weight: 1000;
        }

        .geoSelectionPreview span {
          color: #334155;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.45;
        }

        @media (max-width: 720px) {
          .geoSelectorGrid {
            grid-template-columns: 1fr;
          }

          .geoSearchMenu {
            max-height: 240px;
          }
        }
      `}</style>
    </div>
  );
}
