"use client";

import { useEffect, useMemo, useState } from "react";

type StateRow = {
  id: string;
  name: string;
};

type DistrictRow = {
  id: string;
  state_id: string;
  name: string;
};

type SubdivisionRow = {
  id: string;
  district_id: string;
  name: string;
};

type BlockRow = {
  id: string;
  district_id: string;
  subdivision_id: string | null;
  name: string;
};

type GeographyData = {
  states: StateRow[];
  districts: DistrictRow[];
  subdivisions: SubdivisionRow[];
  blocks: BlockRow[];
};

export default function GeographyOperationsPanel() {
  const [geo, setGeo] = useState<GeographyData>({
    states: [],
    districts: [],
    subdivisions: [],
    blocks: [],
  });

  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [subdivisionId, setSubdivisionId] = useState("");
  const [blockId, setBlockId] = useState("");

  const [stateName, setStateName] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [subdivisionName, setSubdivisionName] = useState("");
  const [blockName, setBlockName] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [placeType, setPlaceType] = useState("locality");
  const [pincode, setPincode] = useState("");

  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  async function loadGeo() {
    const res = await fetch("/api/admin/geography");
    const data = await res.json();

    setGeo({
      states: data?.data?.states || [],
      districts: data?.data?.districts || [],
      subdivisions: data?.data?.subdivisions || [],
      blocks: data?.data?.blocks || [],
    });
  }

  useEffect(() => {
    loadGeo();
  }, []);

  const districts = useMemo(
    () => geo.districts.filter((district) => district.state_id === stateId),
    [geo.districts, stateId]
  );

  const subdivisions = useMemo(
    () =>
      geo.subdivisions.filter(
        (subdivision) => subdivision.district_id === districtId
      ),
    [geo.subdivisions, districtId]
  );

  const blocks = useMemo(
    () =>
      geo.blocks.filter(
        (block) =>
          block.district_id === districtId &&
          (!subdivisionId || block.subdivision_id === subdivisionId)
      ),
    [geo.blocks, districtId, subdivisionId]
  );

  async function createGeo(payload: Record<string, unknown>, successReset: () => void) {
    setSaving(String(payload.type || ""));
    setMessage("");

    const res = await fetch("/api/admin/geography/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    setSaving("");

    if (json.ok) {
      successReset();
      setMessage(`✓ ${json.action}: ${json.data?.name}`);
      await loadGeo();
    } else {
      setMessage(json.error || "Failed");
    }
  }

  function addState() {
    if (!stateName.trim()) return;

    createGeo(
      {
        type: "state",
        name: stateName,
      },
      () => setStateName("")
    );
  }

  function addDistrict() {
    if (!stateId || !districtName.trim()) return;

    createGeo(
      {
        type: "district",
        state_id: stateId,
        name: districtName,
      },
      () => setDistrictName("")
    );
  }

  function addSubdivision() {
    if (!districtId || !subdivisionName.trim()) return;

    createGeo(
      {
        type: "subdivision",
        district_id: districtId,
        name: subdivisionName,
      },
      () => setSubdivisionName("")
    );
  }

  function addBlock() {
    if (!districtId || !blockName.trim()) return;

    createGeo(
      {
        type: "block",
        district_id: districtId,
        subdivision_id: subdivisionId || null,
        name: blockName,
      },
      () => setBlockName("")
    );
  }

  function addPlace() {
    if (!districtId || !placeName.trim()) return;

    createGeo(
      {
        type: "place",
        district_id: districtId,
        subdivision_id: subdivisionId || null,
        block_id: blockId || null,
        name: placeName,
        place_type: placeType,
        pincode,
      },
      () => {
        setPlaceName("");
        setPincode("");
      }
    );
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">
        Geography Operations
      </h2>

      <p className="mt-2 text-sm font-semibold text-slate-600">
        Add districts, subdivisions, blocks and places in proper hierarchy.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <input
          value={stateName}
          onChange={(e) => setStateName(e.target.value)}
          placeholder="State / Union Territory Name"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />

        <button
          onClick={addState}
          disabled={saving === "state"}
          className="rounded-xl bg-cyan-700 px-4 py-2 font-bold text-white"
        >
          {saving === "state" ? "Saving..." : "Add State"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <select
          value={stateId}
          onChange={(e) => {
            setStateId(e.target.value);
            setDistrictId("");
            setSubdivisionId("");
            setBlockId("");
          }}
          className="rounded-xl border border-slate-300 px-3 py-2"
        >
          <option value="">Select State</option>
          {geo.states.map((state) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </select>

        <input
          value={districtName}
          onChange={(e) => setDistrictName(e.target.value)}
          placeholder="District Name"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />

        <button
          onClick={addDistrict}
          disabled={saving === "district"}
          className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white"
        >
          {saving === "district" ? "Saving..." : "Add District"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <select
          value={districtId}
          onChange={(e) => {
            setDistrictId(e.target.value);
            setSubdivisionId("");
            setBlockId("");
          }}
          className="rounded-xl border border-slate-300 px-3 py-2"
        >
          <option value="">Select District</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>

        <input
          value={subdivisionName}
          onChange={(e) => setSubdivisionName(e.target.value)}
          placeholder="Subdivision Name"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />

        <button
          onClick={addSubdivision}
          disabled={saving === "subdivision"}
          className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
        >
          {saving === "subdivision" ? "Saving..." : "Add Subdivision"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <select
          value={subdivisionId}
          onChange={(e) => {
            setSubdivisionId(e.target.value);
            setBlockId("");
          }}
          className="rounded-xl border border-slate-300 px-3 py-2"
        >
          <option value="">Select Subdivision</option>
          {subdivisions.map((subdivision) => (
            <option key={subdivision.id} value={subdivision.id}>
              {subdivision.name}
            </option>
          ))}
        </select>

        <input
          value={blockName}
          onChange={(e) => setBlockName(e.target.value)}
          placeholder="Block Name"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />

        <button
          onClick={addBlock}
          disabled={saving === "block"}
          className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white"
        >
          {saving === "block" ? "Saving..." : "Add Block"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-6">
        <select
          value={blockId}
          onChange={(e) => setBlockId(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2"
        >
          <option value="">Select Block</option>
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>
              {block.name}
            </option>
          ))}
        </select>

        <input
          value={placeName}
          onChange={(e) => setPlaceName(e.target.value)}
          placeholder="Place Name"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />

        <select
          value={placeType}
          onChange={(e) => setPlaceType(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2"
        >
          <option value="locality">Locality</option>
          <option value="village">Village</option>
          <option value="town">Town</option>
          <option value="market">Market</option>
          <option value="ward">Ward</option>
          <option value="industrial_area">Industrial Area</option>
        </select>

        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          placeholder="Pincode"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />

        <button
          onClick={addPlace}
          disabled={saving === "place"}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white md:col-span-2"
        >
          {saving === "place" ? "Saving..." : "Add Place"}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {message}
        </div>
      )}
    </div>
  );
}
