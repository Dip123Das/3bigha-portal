export type ProjectWorkflowStage =
  | "land-calculation"
  | "construction-estimation"
  | "material-planning"
  | "rfq"
  | "vendor-selection"
  | "procurement"
  | "execution";

export type ProjectWorkflowData = {
  id: string;
  title: string;

  state?: string;
  district?: string;

  areaSqft?: number;

  buildingType?: string;
  quality?: string;

  estimatedBudgetMin?: number;
  estimatedBudgetMax?: number;

  currentStage: ProjectWorkflowStage;

  completedStages: ProjectWorkflowStage[];

  updatedAt: number;

  source?: string;
};

const STORAGE_KEY = "threebigha-project-workflow";

export function loadProjectWorkflow(): ProjectWorkflowData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    return JSON.parse(raw) as ProjectWorkflowData;
  } catch {
    return null;
  }
}

export function saveProjectWorkflow(data: ProjectWorkflowData) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function clearProjectWorkflow() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function updateProjectWorkflowStage(
  stage: ProjectWorkflowStage
) {
  const current = loadProjectWorkflow();

  if (!current) return;

  const completed = new Set(current.completedStages);

  completed.add(stage);

  saveProjectWorkflow({
    ...current,
    currentStage: stage,
    completedStages: Array.from(completed),
    updatedAt: Date.now(),
  });
}
