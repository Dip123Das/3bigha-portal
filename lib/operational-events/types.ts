export type OperationalEventTone =
  | "normal"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type OperationalEventModule =
  | "inbox"
  | "rfq"
  | "quote"
  | "thread"
  | "vendor"
  | "buyer"
  | "procurement"
  | "dispatch"
  | "billing"
  | "inventory"
  | "property"
  | "services"
  | "rentals"
  | "materials"
  | "general";

export type OperationalEvent = {
  id: string;
  module: OperationalEventModule;
  title: string;
  detail?: string;
  href?: string;
  tone?: OperationalEventTone;
  createdAt: number;
};
