"use client";

import GeoSelector, { type GeoSelection } from "@/components/geography/GeoSelector";
import { formatAddress } from "@/lib/geography/formatter";

export type AddressEngineValue = {
  geography?: GeoSelection;
  premises_type?: string | null;
  house_flat_plot_no?: string | null;
  building_market_name?: string | null;
  street_road_locality?: string | null;
  landmark?: string | null;
  pincode?: string | null;
};

type AddressEngineProps = {
  value?: AddressEngineValue;
  onChange: (value: AddressEngineValue) => void;
  disabled?: boolean;
};

const PREMISES_TYPES = [
  "Residential House",
  "Apartment",
  "Shop",
  "Office",
  "Warehouse",
  "Factory",
  "Godown",
  "Construction Site",
  "Industrial Plot",
  "Commercial Plot",
  "Agricultural Land",
  "Other",
];

export default function AddressEngine({
  value,
  onChange,
  disabled = false,
}: AddressEngineProps) {
  const current: AddressEngineValue = value || {};

  function update(patch: Partial<AddressEngineValue>) {
    onChange({ ...current, ...patch });
  }

  const preview = formatAddress({
    premisesType: current.premises_type,
    houseFlatPlotNo: current.house_flat_plot_no,
    buildingMarketName: current.building_market_name,
    streetRoadLocality: current.street_road_locality,
    landmark: current.landmark,
    place: current.geography?.place?.name,
    admin2: current.geography?.block?.name,
    admin1: current.geography?.subdivision?.name,
    district: current.geography?.district?.name,
    state: current.geography?.state?.name,
    pincode: current.pincode || current.geography?.place?.pincode,
  });

  return (
    <div className="addressEngineCard">
      <GeoSelector
        value={current.geography}
        disabled={disabled}
        includeSubdivision
        includeBlock
        includePlace
        onChange={(geography) =>
          update({
            geography,
            pincode:
              current.pincode ||
              geography?.place?.pincode ||
              null,
          })
        }
      />

      <div className="addressManualCard">
        <h4>Exact Address Details</h4>

        <label>
          <span>Premises Type</span>
          <select
            value={current.premises_type || ""}
            disabled={disabled}
            onChange={(event) => update({ premises_type: event.target.value || null })}
          >
            <option value="">Select premises type</option>
            {PREMISES_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>House / Flat / Plot / Shop No.</span>
          <input
            value={current.house_flat_plot_no || ""}
            disabled={disabled}
            onChange={(event) => update({ house_flat_plot_no: event.target.value })}
            placeholder="Example: Plot 12, Shop 4, Flat 3B"
          />
        </label>

        <label>
          <span>Building / Apartment / Market Name</span>
          <input
            value={current.building_market_name || ""}
            disabled={disabled}
            onChange={(event) => update({ building_market_name: event.target.value })}
            placeholder="Example: New Market Complex"
          />
        </label>

        <label>
          <span>Street / Road / Para / Locality Detail</span>
          <input
            value={current.street_road_locality || ""}
            disabled={disabled}
            onChange={(event) => update({ street_road_locality: event.target.value })}
            placeholder="Example: Dinhata Road, Rail Ghumti"
          />
        </label>

        <label>
          <span>Landmark</span>
          <input
            value={current.landmark || ""}
            disabled={disabled}
            onChange={(event) => update({ landmark: event.target.value })}
            placeholder="Example: Near SBI ATM"
          />
        </label>

        <label>
          <span>Pincode</span>
          <input
            value={current.pincode || current.geography?.place?.pincode || ""}
            disabled={disabled}
            onChange={(event) => update({ pincode: event.target.value })}
            placeholder="Enter correct PIN code manually if not auto-filled"
          />
        </label>
      </div>

      <div className="addressPreview">
        <strong>Address Preview</strong>
        <span>{preview || "Select geography and enter exact address details."}</span>
      </div>

      <style jsx>{`
        .addressEngineCard {
          display: grid;
          gap: 14px;
        }

        .addressManualCard {
          display: grid;
          gap: 12px;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: #ffffff;
        }

        .addressManualCard h4 {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          font-weight: 1000;
        }

        .addressManualCard label {
          display: grid;
          gap: 6px;
        }

        .addressManualCard span {
          color: #334155;
          font-size: 12px;
          font-weight: 900;
        }

        .addressManualCard input,
        .addressManualCard select {
          width: 100%;
          height: 46px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 0 14px;
          outline: none;
          font-size: 14px;
          font-weight: 800;
        }

        .addressManualCard input:focus,
        .addressManualCard select:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
        }

        .addressPreview {
          display: grid;
          gap: 5px;
          padding: 12px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }

        .addressPreview strong {
          font-size: 12px;
          font-weight: 1000;
          color: #0f172a;
        }

        .addressPreview span {
          font-size: 12px;
          font-weight: 750;
          line-height: 1.5;
          color: #334155;
        }
      `}</style>
    </div>
  );
}
