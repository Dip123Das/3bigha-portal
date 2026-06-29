import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { getLgdState } from "./lgd-states.mjs";

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL and service/anon key");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export function requireState(slug) {
  const state = getLgdState(slug);
  if (!state) throw new Error(`Unknown state slug: ${slug}`);
  return state;
}

export function lgdFilePath(folder, stateSlug) {
  return path.join("data", "lgd", folder, `${folder}-${stateSlug}.xls`);
}

export function requireLgdFile(folder, stateSlug) {
  const file = lgdFilePath(folder, stateSlug);
  if (!fs.existsSync(file)) throw new Error(`Missing LGD file: ${file}`);
  return file;
}

export function normalizeKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function clean(value) {
  return String(value ?? "").trim();
}

export function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toInt(value) {
  const cleaned = clean(value).replace(/\.0$/, "");
  if (!cleaned) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isHeaderRow(row) {
  const joined = row.map((v) => clean(v).toLowerCase()).join(" | ");
  return (
    joined.includes("district code") ||
    joined.includes("subdistrict code") ||
    joined.includes("sub district code") ||
    joined.includes("block code") ||
    joined.includes("village code") ||
    joined.includes("localbody code") ||
    joined.includes("local body code") ||
    joined.includes("ward code")
  );
}

export function readLgdRows(folder, stateSlug) {
  const file = requireLgdFile(folder, stateSlug);
  const workbook = XLSX.readFile(file);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) throw new Error(`No sheet found in ${file}`);

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    blankrows: false,
  });

  const headerIndex = matrix.findIndex(isHeaderRow);

  if (headerIndex === -1) {
    throw new Error(`Could not detect LGD header row in ${file}`);
  }

  const seen = {};
  const headers = matrix[headerIndex].map((header, index) => {
    let key = normalizeKey(header);

    const nextRowLabel = clean(matrix[headerIndex + 1]?.[index]).toLowerCase();

    if (key && nextRowLabel.includes("english")) key = `${key}_english`;
    if (key && nextRowLabel.includes("local")) key = `${key}_local`;

    if (key && seen[key] !== undefined) {
      seen[key] += 1;
      key = `${key}_${seen[key]}`;
    } else if (key) {
      seen[key] = 0;
    }

    return key;
  });

  const rows = [];

  for (const raw of matrix.slice(headerIndex + 1)) {
    const row = {};

    headers.forEach((header, index) => {
      if (header) row[header] = raw[index] ?? "";
    });

    const hasData = Object.values(row).some((value) => clean(value) !== "");
    const hasCode = Object.entries(row).some(
      ([key, value]) => key.endsWith("_code") && toInt(value)
    );

    if (hasData && hasCode) rows.push(row);
  }

  return rows;
}

export function pick(row, candidates) {
  for (const key of candidates) {
    const normalized = normalizeKey(key);
    if (row[normalized] !== undefined && clean(row[normalized]) !== "") {
      return row[normalized];
    }
  }
  return "";
}

export async function upsertRows({
  supabase,
  table,
  rows,
  onConflict,
  chunkSize = 500,
}) {
  let inserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (!chunk.length) continue;

    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict });

    if (error) throw new Error(`${table} upsert failed: ${error.message}`);

    inserted += chunk.length;
  }

  return inserted;
}
