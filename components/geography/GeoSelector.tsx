"use client";

import { useEffect, useMemo, useState } from "react";

type GeoOption = {
  id: string;
  name: string;
  slug?: string | null;
  state_id?: string | null;
  district_id?: string | null;
  subdivision_id?: string | null;
  block_id?: string | null;
  pincode?: string | null;
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

async function loadOptions(type: string, params: Record<string, string | undefined>) {
  const url = new URL("/api/geography/options", window.location.origin);
  url.searchParams.set("type", type);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();
  return Array.isArray(json.options) ? (json.options as GeoOption[]) : [];
}

function findById(options: GeoOption[], id?: string | null) {
  if (!id) return null;
  return options.find((item) => item.id === id) || null;
}

function SelectBox({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value?: string;
  options: GeoOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (option: GeoOption | null) => void;
}) {
  return (
    <label className="geoSelectorField">
      <span>{label}</span>
      <select
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(findById(options, e.target.value))}
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
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
  const [states, setStates] = useState<GeoOption[]>([]);
  const [districts, setDistricts] = useState<GeoOption[]>([]);
  const [subdivisions, setSubdivisions] = useState<GeoOption[]>([]);
  const [blocks, setBlocks] = useState<GeoOption[]>([]);
  const [places, setPlaces] = useState<GeoOption[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    loadOptions("states", {})
      .then((items) => {
        if (mounted) setStates(items);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    setDistricts([]);
    setSubdivisions([]);
    setBlocks([]);
    setPlaces([]);

    if (!selection.state?.id) return;

    loadOptions("districts", { stateId: selection.state.id }).then((items) => {
      if (mounted) setDistricts(items);
    });

    return () => {
      mounted = false;
    };
  }, [selection.state?.id]);

  useEffect(() => {
    let mounted = true;

    setSubdivisions([]);
    setBlocks([]);
    setPlaces([]);

    if (!selection.district?.id) return;

    Promise.all([
      includeSubdivision
        ? loadOptions("subdivisions", { districtId: selection.district.id })
        : Promise.resolve([]),
      includeBlock
        ? loadOptions("blocks", { districtId: selection.district.id })
        : Promise.resolve([]),
      includePlace
        ? loadOptions("places", {
            stateId: selection.state?.id,
            districtId: selection.district.id,
          })
        : Promise.resolve([]),
    ]).then(([subdivisionItems, blockItems, placeItems]) => {
      if (!mounted) return;
      setSubdivisions(subdivisionItems);
      setBlocks(blockItems);
      setPlaces(placeItems);
    });

    return () => {
      mounted = false;
    };
  }, [
    includeSubdivision,
    includeBlock,
    includePlace,
    selection.state?.id,
    selection.district?.id,
  ]);

  useEffect(() => {
    let mounted = true;

    if (!includeBlock || !selection.subdivision?.id || !selection.district?.id) return;

    setBlocks([]);
    setPlaces([]);

    Promise.all([
      loadOptions("blocks", {
        districtId: selection.district.id,
        subdivisionId: selection.subdivision.id,
      }),
      includePlace
        ? loadOptions("places", {
            stateId: selection.state?.id,
            districtId: selection.district.id,
            subdivisionId: selection.subdivision.id,
          })
        : Promise.resolve([]),
    ]).then(([blockItems, placeItems]) => {
      if (!mounted) return;
      setBlocks(blockItems);
      setPlaces(placeItems);
    });

    return () => {
      mounted = false;
    };
  }, [
    includeBlock,
    includePlace,
    selection.state?.id,
    selection.district?.id,
    selection.subdivision?.id,
  ]);

  useEffect(() => {
    let mounted = true;

    if (!includePlace || !selection.block?.id || !selection.district?.id) return;

    setPlaces([]);

    loadOptions("places", {
      stateId: selection.state?.id,
      districtId: selection.district.id,
      subdivisionId: selection.subdivision?.id,
      blockId: selection.block.id,
    }).then((items) => {
      if (mounted) setPlaces(items);
    });

    return () => {
      mounted = false;
    };
  }, [
    includePlace,
    selection.state?.id,
    selection.district?.id,
    selection.subdivision?.id,
    selection.block?.id,
  ]);

  return (
    <div className="geoSelectorCard">
      <div className="geoSelectorHead">
        <strong>📍 Select Location</strong>
        <small>{loading ? "Loading geography..." : "Choose from 3Bigha geography database"}</small>
      </div>

      <div className="geoSelectorGrid">
        <SelectBox
          label="State"
          placeholder="Select state"
          value={selection.state?.id}
          options={states}
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

        <SelectBox
          label="District"
          placeholder={selection.state ? "Select district" : "Select state first"}
          value={selection.district?.id}
          options={districts}
          disabled={disabled || !selection.state}
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

        {includeSubdivision ? (
          <SelectBox
            label="Subdivision"
            placeholder={selection.district ? "Select subdivision" : "Select district first"}
            value={selection.subdivision?.id}
            options={subdivisions}
            disabled={disabled || !selection.district}
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
          <SelectBox
            label="Block"
            placeholder={selection.district ? "Select block" : "Select district first"}
            value={selection.block?.id}
            options={blocks}
            disabled={disabled || !selection.district}
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
          <SelectBox
            label="City / Place"
            placeholder={selection.district ? "Select city / place" : "Select district first"}
            value={selection.place?.id}
            options={places}
            disabled={disabled || !selection.district}
            onChange={(place) =>
              updateSelection({
                ...selection,
                place,
              })
            }
          />
        ) : null}
      </div>

      <style jsx>{`
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

        .geoSelectorField {
          display: grid;
          gap: 6px;
        }

        .geoSelectorField span {
          color: #334155;
          font-size: 12px;
          font-weight: 900;
        }

        .geoSelectorField select {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #ffffff;
          color: #0f172a;
          padding: 0 14px;
          font-size: 14px;
          font-weight: 900;
          outline: none;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
          cursor: pointer;
        }

        .geoSelectorField select:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
        }

        .geoSelectorField select:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }

        @media (max-width: 720px) {
          .geoSelectorGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
