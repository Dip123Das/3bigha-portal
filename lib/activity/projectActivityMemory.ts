export type ProjectActivityType =
  | "workflow"
  | "rfq"
  | "vendor"
  | "procurement"
  | "execution"
  | "delivery"
  | "payment";

export type ProjectActivityItem = {
  id: string;

  type: ProjectActivityType;

  title: string;

  description?: string;

  actor?: string;

  createdAt: number;
};

const STORAGE_KEY =
  "threebigha-project-activity-feed";

export function loadProjectActivities():
  ProjectActivityItem[] {
  if (typeof window === "undefined")
    return [];

  try {
    const raw = localStorage.getItem(
      STORAGE_KEY
    );

    if (!raw) return [];

    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjectActivities(
  items: ProjectActivityItem[]
) {
  if (typeof window === "undefined")
    return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items)
    );
  } catch {}
}

export function addProjectActivity(
  item: ProjectActivityItem
) {
  const current =
    loadProjectActivities();

  current.unshift(item);

  saveProjectActivities(
    current.slice(0, 100)
  );
}
