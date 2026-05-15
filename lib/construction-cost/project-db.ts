import type { ConstructionGrade } from "./cost-config";

export type ConstructionProjectStatus =
  | "planning"
  | "rfq_started"
  | "procurement"
  | "execution"
  | "completed"
  | "cancelled";

export type ConstructionProjectDbRow = {
  id: string;
  user_id: string | null;

  title: string;
  city: string | null;
  locality: string | null;
  pincode: string | null;

  built_up_area_sqft: number;
  floor_count: number;
  grade: ConstructionGrade;
  room_count: number;
  bathroom_count: number;
  kitchen_count: number;
  has_interior_work: boolean;

  project_start_date: string | null;
  status: ConstructionProjectStatus;

  created_at: string;
  updated_at: string;
};

export type ConstructionProjectSnapshotRow = {
  id: string;
  project_id: string;
  user_id: string | null;

  snapshot_type: string;

  cost_estimate: unknown | null;
  material_estimate: unknown | null;
  boq_estimate: unknown | null;
  timeline_estimate: unknown | null;
  procurement_schedule: unknown | null;
  rfq_drafts: unknown | null;

  created_at: string;
};

export type CreateConstructionProjectPayload = {
  title: string;
  city?: string;
  locality?: string;
  pincode?: string;

  builtUpAreaSqFt: number;
  floorCount?: number;
  grade?: ConstructionGrade;
  roomCount?: number;
  bathroomCount?: number;
  kitchenCount?: number;
  hasInteriorWork?: boolean;

  projectStartDate?: string;
  status?: ConstructionProjectStatus;
};

export type UpdateConstructionProjectPayload =
  Partial<CreateConstructionProjectPayload>;

export function normalizeConstructionProjectInsert(
  payload: CreateConstructionProjectPayload,
  userId: string,
) {
  return {
    user_id: userId,
    title: payload.title.trim(),
    city: payload.city?.trim() || null,
    locality: payload.locality?.trim() || null,
    pincode: payload.pincode?.trim() || null,

    built_up_area_sqft: Math.max(100, Math.round(payload.builtUpAreaSqFt)),
    floor_count: Math.max(1, Math.round(payload.floorCount ?? 1)),
    grade: payload.grade ?? "standard",
    room_count: Math.max(1, Math.round(payload.roomCount ?? 3)),
    bathroom_count: Math.max(1, Math.round(payload.bathroomCount ?? 2)),
    kitchen_count: Math.max(1, Math.round(payload.kitchenCount ?? 1)),
    has_interior_work: Boolean(payload.hasInteriorWork),

    project_start_date: payload.projectStartDate || null,
    status: payload.status ?? "planning",
  };
}

export function normalizeConstructionProjectUpdate(
  payload: UpdateConstructionProjectPayload,
) {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.title !== undefined) update.title = payload.title.trim();
  if (payload.city !== undefined) update.city = payload.city?.trim() || null;
  if (payload.locality !== undefined) {
    update.locality = payload.locality?.trim() || null;
  }
  if (payload.pincode !== undefined) {
    update.pincode = payload.pincode?.trim() || null;
  }

  if (payload.builtUpAreaSqFt !== undefined) {
    update.built_up_area_sqft = Math.max(
      100,
      Math.round(payload.builtUpAreaSqFt),
    );
  }

  if (payload.floorCount !== undefined) {
    update.floor_count = Math.max(1, Math.round(payload.floorCount));
  }

  if (payload.grade !== undefined) update.grade = payload.grade;

  if (payload.roomCount !== undefined) {
    update.room_count = Math.max(1, Math.round(payload.roomCount));
  }

  if (payload.bathroomCount !== undefined) {
    update.bathroom_count = Math.max(1, Math.round(payload.bathroomCount));
  }

  if (payload.kitchenCount !== undefined) {
    update.kitchen_count = Math.max(1, Math.round(payload.kitchenCount));
  }

  if (payload.hasInteriorWork !== undefined) {
    update.has_interior_work = Boolean(payload.hasInteriorWork);
  }

  if (payload.projectStartDate !== undefined) {
    update.project_start_date = payload.projectStartDate || null;
  }

  if (payload.status !== undefined) update.status = payload.status;

  return update;
}