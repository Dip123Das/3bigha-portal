export type WorkflowContext =
  | "inbox"
  | "thread"
  | "rfq"
  | "quote_compare"
  | "vendor_dashboard"
  | "buyer_dashboard"
  | "procurement"
  | "inventory"
  | "billing"
  | "dispatch"
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "investment"
  | "admin"
  | "general";

export type NextActionResult = {
  label: string;
  description: string;
  href?: string;
  stage: string;
  risk: "Low" | "Medium" | "High";
};

export function resolveNextAction(context: WorkflowContext): NextActionResult {
  switch (context) {
    case "inbox":
      return {
        label: "Open the most important conversation",
        description: "Start with the thread that needs reply, quotation, follow-up, or closure.",
        href: "/dashboard/inbox-v2",
        stage: "Reviewing messages",
        risk: "Medium",
      };

    case "thread":
      return {
        label: "Reply or move the deal forward",
        description: "Read the latest message, reply clearly, and use AI only for reply help or deal signals.",
        stage: "Conversation active",
        risk: "Medium",
      };

    case "rfq":
      return {
        label: "Complete the requirement and send RFQ",
        description: "Write what you need, quantity, location, delivery time, and expected response.",
        href: "/rfq",
        stage: "Requirement creation",
        risk: "Low",
      };

    case "quote_compare":
      return {
        label: "Compare vendor quotes",
        description: "Check price, delivery, trust, risk, and then shortlist the best vendor.",
        stage: "Decision making",
        risk: "Medium",
      };

    case "vendor_dashboard":
      return {
        label: "Check pending buyer work",
        description: "Review RFQs, inbox, inventory, billing, and dispatch from one operational view.",
        href: "/dashboard/vendor",
        stage: "Vendor operations",
        risk: "Medium",
      };

    case "procurement":
      return {
        label: "Act on the most urgent procurement task",
        description: "Start with delayed, risky, or high-value procurement workflows before checking advanced AI.",
        href: "/dashboard/procurement-os",
        stage: "Procurement execution",
        risk: "High",
      };

    case "inventory":
      return {
        label: "Check stock and update movement",
        description: "Add stock, update low items, and connect inventory with billing or dispatch.",
        href: "/dashboard/vendor/inventory",
        stage: "Stock control",
        risk: "Medium",
      };

    case "billing":
      return {
        label: "Create or verify bill",
        description: "Prepare bill, check payment status, and connect it with dispatch if needed.",
        href: "/dashboard/vendor/billing",
        stage: "Billing",
        risk: "Low",
      };

    case "dispatch":
      return {
        label: "Assign or track delivery",
        description: "Check pending delivery, assign vehicle, and send update to buyer.",
        href: "/dashboard/vendor/dispatch",
        stage: "Dispatch",
        risk: "Medium",
      };

    default:
      return {
        label: "Continue the current work",
        description: "Understand the page, complete the main action, then use AI help if needed.",
        stage: "Operational work",
        risk: "Low",
      };
  }
}
