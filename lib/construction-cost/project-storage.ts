import type { ConstructionGrade } from "./cost-config";

export type SavedConstructionProject = {
  id: string;
  title: string;
  city?: string;
  locality?: string;
  pincode?: string;

  builtUpAreaSqFt: number;
  floorCount: number;
  grade: ConstructionGrade;
  roomCount: number;
  bathroomCount: number;
  kitchenCount: number;
  hasInteriorWork: boolean;

  projectStartDate?: string;

  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "3bigha_saved_construction_projects_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getSavedConstructionProjects(): SavedConstructionProject[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSavedConstructionProjectById(
  id: string,
): SavedConstructionProject | null {
  return getSavedConstructionProjects().find((project) => project.id === id) ?? null;
}

export function saveConstructionProject(
  input: Omit<SavedConstructionProject, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): SavedConstructionProject {
  const now = new Date().toISOString();
  const existingProjects = getSavedConstructionProjects();

  const existing: SavedConstructionProject | undefined = input.id
    ? existingProjects.find((project) => project.id === input.id)
    : undefined;

  const project: SavedConstructionProject = {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    title: input.title,
    city: input.city,
    locality: input.locality,
    pincode: input.pincode,
    builtUpAreaSqFt: input.builtUpAreaSqFt,
    floorCount: input.floorCount,
    grade: input.grade,
    roomCount: input.roomCount,
    bathroomCount: input.bathroomCount,
    kitchenCount: input.kitchenCount,
    hasInteriorWork: input.hasInteriorWork,
    projectStartDate: input.projectStartDate,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const next = existing
    ? existingProjects.map((item) => (item.id === project.id ? project : item))
    : [project, ...existingProjects];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 50)));

  return project;
}

export function deleteSavedConstructionProject(id: string): void {
  if (!isBrowser()) return;

  const next = getSavedConstructionProjects().filter(
    (project) => project.id !== id,
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}