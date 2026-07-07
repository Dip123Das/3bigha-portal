# 004 — Platform Map

Generated from SAHAJ full audit.

Total audited routes: 466

## Product Domains

### API (204)

#### Journey: Build

- `app/api/construction-cost/create-rfq/route.ts`
- `app/api/construction-cost/estimate/route.ts`
- `app/api/construction-cost/export/route.ts`
- `app/api/construction-drawing/analyze/route.ts`
- `app/api/construction-projects/[id]/alerts/route.ts`
- `app/api/construction-projects/[id]/command-center/route.ts`
- `app/api/construction-projects/[id]/execution-feed/route.ts`
- `app/api/construction-projects/[id]/forecast/route.ts`
- `app/api/construction-projects/[id]/health/route.ts`
- `app/api/construction-projects/[id]/milestones/route.ts`
- `app/api/construction-projects/[id]/recovery/route.ts`
- `app/api/construction-projects/[id]/route.ts`
- `app/api/construction-projects/[id]/supervisor/route.ts`
- `app/api/construction-projects/route.ts`

#### Journey: Buy / Discover

- `app/api/ai/marketplace-discovery/route.ts`
- `app/api/ai/marketplace-orchestrator/route.ts`
- `app/api/ai/search-intent/route.ts`
- `app/api/cron/marketplace-opportunities/route.ts`
- `app/api/marketplace/vendor-conversion/route.ts`
- `app/api/system/marketplace-expansion-automation-refresh/route.ts`
- `app/api/system/marketplace-intelligence-refresh/route.ts`
- `app/api/system/marketplace-liquidity-refresh/route.ts`
- `app/api/system/marketplace-promotion-refresh/route.ts`
- `app/api/system/marketplace-rfq-intelligence-refresh/route.ts`

#### Journey: Buy / Manage

- `app/api/ai/rfq-generator/route.ts`
- `app/api/ai/rfq-intelligence/route.ts`
- `app/api/buyer/rfq/[rfqId]/accept/route.ts`
- `app/api/cron/rfq-followups/route.ts`
- `app/api/rfq-conversations/[rfqId]/messages/[messageId]/route.ts`
- `app/api/rfq-conversations/[rfqId]/messages/route.ts`
- `app/api/rfq/create/route.ts`
- `app/api/rfq/nearby-vendor-recommendations/route.ts`
- `app/api/rfq/vendor-matches/route.ts`
- `app/api/vendor/rfq/mark-viewed-bulk/route.ts`
- `app/api/vendor/rfq/mark-viewed/route.ts`
- `app/api/vendor/rfqs/[id]/route.ts`
- `app/api/vendor/rfqs/route.ts`

#### Journey: Discover

- `app/api/ai/autonomous-execution/route.ts`
- `app/api/ai/chat-reply-suggestions/route.ts`
- `app/api/ai/deal-conversion/route.ts`
- `app/api/ai/deal-message/route.ts`
- `app/api/ai/deal-ready/route.ts`
- `app/api/ai/deal-score/route.ts`
- `app/api/ai/deal-stage/route.ts`
- `app/api/ai/execute-task/route.ts`
- `app/api/ai/inventory-intelligence/route.ts`
- `app/api/ai/lead-score/route.ts`
- `app/api/ai/memory-events/route.ts`
- `app/api/ai/price-prediction/route.ts`
- `app/api/ai/price-suggestion/route.ts`
- `app/api/ai/procurement-adaptive-resilience/route.ts`
- `app/api/ai/procurement-anomaly/route.ts`
- `app/api/ai/procurement-assistant/route.ts`
- `app/api/ai/procurement-auto-action/route.ts`
- `app/api/ai/procurement-autonomous-assist/route.ts`
- `app/api/ai/procurement-autonomous-decisions/route.ts`
- `app/api/ai/procurement-autonomous-tasks/route.ts`
- `app/api/ai/procurement-closure-agent/route.ts`
- `app/api/ai/procurement-command-palette/route.ts`
- `app/api/ai/procurement-control-tower/route.ts`
- `app/api/ai/procurement-copilot-briefing/route.ts`
- `app/api/ai/procurement-copilot-command/route.ts`
- `app/api/ai/procurement-copilot-memory/route.ts`
- `app/api/ai/procurement-copilot/route.ts`
- `app/api/ai/procurement-crisis-center/route.ts`
- `app/api/ai/procurement-crisis-escalation/route.ts`
- `app/api/ai/procurement-daily-briefing/route.ts`
- `app/api/ai/procurement-emergency-rerouting/route.ts`
- `app/api/ai/procurement-execution-actions/route.ts`
- `app/api/ai/procurement-execution-engine/route.ts`
- `app/api/ai/procurement-execution-governance/route.ts`
- `app/api/ai/procurement-execution-readiness/route.ts`
- `app/api/ai/procurement-executive-continuity/route.ts`
- `app/api/ai/procurement-executive-synthesis/route.ts`
- `app/api/ai/procurement-followup-agent/route.ts`
- `app/api/ai/procurement-forecast/route.ts`
- `app/api/ai/procurement-health-score/route.ts`
- `app/api/ai/procurement-inbox-actions/route.ts`
- `app/api/ai/procurement-live-events/route.ts`
- `app/api/ai/procurement-memory-evolution/route.ts`
- `app/api/ai/procurement-memory-intelligence/route.ts`
- `app/api/ai/procurement-memory/route.ts`
- `app/api/ai/procurement-mission-control/route.ts`
- `app/api/ai/procurement-negotiation-agent/route.ts`
- `app/api/ai/procurement-notification-engine/route.ts`
- `app/api/ai/procurement-operator-intelligence/route.ts`
- `app/api/ai/procurement-outcome-learning/route.ts`
- `app/api/ai/procurement-recommendations/route.ts`
- `app/api/ai/procurement-recovery-agent/route.ts`
- `app/api/ai/procurement-recovery-command-center/route.ts`
- `app/api/ai/procurement-self-stabilization/route.ts`
- `app/api/ai/procurement-shortage-forecast/route.ts`
- `app/api/ai/procurement-situation-feed/route.ts`
- `app/api/ai/procurement-strategic-orchestration/route.ts`
- `app/api/ai/procurement-supplier-collapse/route.ts`
- `app/api/ai/procurement-supplier-reliability/route.ts`
- `app/api/ai/procurement-task-execution-log/route.ts`
- ...and 75 more

#### Journey: Grow

- `app/api/ai/vendor-alert/route.ts`
- `app/api/ai/vendor-coach/route.ts`
- `app/api/ai/vendor-document-verify/route.ts`
- `app/api/cron/vendor-intelligence-refresh/route.ts`
- `app/api/nearby/vendors/route.ts`
- `app/api/onboarding/verify-location/route.ts`
- `app/api/public/vendor-opportunities/route.ts`
- `app/api/system/vendor-intelligence-refresh/route.ts`
- `app/api/vendor/billing/[billNo]/pdf/route.ts`
- `app/api/vendor/billing/[billNo]/verify/route.ts`
- `app/api/vendor/dispatch/send-whatsapp-update/route.ts`
- `app/api/vendor/inbox/row/route.ts`
- `app/api/vendor/leaderboard/route.ts`
- `app/api/vendor/notifications/route.ts`
- `app/api/vendor/performance/route.ts`
- `app/api/vendor/price-updates/route.ts`
- `app/api/vendor/rank-history/route.ts`
- `app/api/vendor/whatsapp-alerts/send/route.ts`

#### Journey: Manage

- `app/api/admin/approve-user/route.ts`
- `app/api/admin/geography-audit/route.ts`
- `app/api/admin/geography/manage/route.ts`
- `app/api/admin/geography/resolve/route.ts`
- `app/api/admin/geography/route.ts`
- `app/api/admin/investment/plans/[id]/route.ts`
- `app/api/admin/investment/plans/route.ts`
- `app/api/admin/operations/status/route.ts`
- `app/api/admin/price-updates/ai-draft/route.ts`
- `app/api/admin/price-updates/route.ts`
- `app/api/admin/reject-user/route.ts`
- `app/api/admin/schema-audit/route.ts`
- `app/api/admin/update-subscription/route.ts`
- `app/api/admin/vendor-control/route.ts`

### Administration (50)

#### Journey: Manage

- `app/admin/blog/page.tsx`
- `app/admin/dashboard/banker-verification/page.tsx`
- `app/admin/dashboard/finance-leads/[id]/page.tsx`
- `app/admin/dashboard/finance-leads/page.tsx`
- `app/admin/dashboard/geography/page.tsx`
- `app/admin/dashboard/investment/opportunities/[id]/page.tsx`
- `app/admin/dashboard/investment/opportunities/page.tsx`
- `app/admin/dashboard/investment/page.tsx`
- `app/admin/dashboard/investment/plans/[id]/page.tsx`
- `app/admin/dashboard/investment/plans/new/page.tsx`
- `app/admin/dashboard/investment/plans/page.tsx`
- `app/admin/dashboard/marketplace-intelligence/page.tsx`
- `app/admin/dashboard/master-data/materials/attributes/page.tsx`
- `app/admin/dashboard/master-data/materials/mapping/page.tsx`
- `app/admin/dashboard/master-data/materials/taxonomy/page.tsx`
- `app/admin/dashboard/master-data/measurement/page.tsx`
- `app/admin/dashboard/master-data/page.tsx`
- `app/admin/dashboard/master-data/property/attributes/page.tsx`
- `app/admin/dashboard/master-data/property/mapping/page.tsx`
- `app/admin/dashboard/master-data/property/taxonomy/page.tsx`
- `app/admin/dashboard/master-data/property/values/page.tsx`
- `app/admin/dashboard/master-data/rentals/attributes/page.tsx`
- `app/admin/dashboard/master-data/rentals/mapping/page.tsx`
- `app/admin/dashboard/master-data/rentals/taxonomy/page.tsx`
- `app/admin/dashboard/master-data/rentals/values/page.tsx`
- `app/admin/dashboard/master-data/services/attributes/page.tsx`
- `app/admin/dashboard/master-data/services/mapping/page.tsx`
- `app/admin/dashboard/master-data/services/taxonomy/page.tsx`
- `app/admin/dashboard/operations/page.tsx`
- `app/admin/dashboard/page.tsx`
- `app/admin/dashboard/price-updates/page.tsx`
- `app/admin/dashboard/seo/page.tsx`
- `app/admin/dashboard/support/[ticketId]/page.tsx`
- `app/admin/dashboard/support/page.tsx`
- `app/admin/dashboard/vendor-control/page.tsx`
- `app/admin/dashboard/vendor-recruitment/page.tsx`
- `app/admin/materials/page.tsx`
- `app/admin/operations/page.tsx`
- `app/admin/page.tsx`
- `app/admin/property/[id]/page.tsx`
- `app/admin/property/inventory/page.tsx`
- `app/admin/property/listings/page.tsx`
- `app/admin/property/page.tsx`
- `app/admin/property/preview/page.tsx`
- `app/admin/property/projects/page.tsx`
- `app/admin/rentals/[id]/page.tsx`
- `app/admin/rentals/page.tsx`
- `app/admin/services/[id]/page.tsx`
- `app/admin/services/page.tsx`
- `app/admin/users/page.tsx`

### Business / Vendor (15)

#### Journey: Grow

- `app/vendor-inbox/page.tsx`
- `app/vendor-opportunities/[state]/[district]/[place]/page.tsx`
- `app/vendor-opportunities/[state]/[district]/page.tsx`
- `app/vendor-opportunities/[state]/page.tsx`
- `app/vendor-opportunities/page.tsx`
- `app/vendor/[slug]/page.tsx`
- `app/vendor/discovery/page.tsx`
- `app/vendor/inbox-v2/[rfqId]/chat/page.tsx`
- `app/vendor/inbox-v2/[rfqId]/delivery-update/route.ts`
- `app/vendor/inbox-v2/[rfqId]/page.tsx`
- `app/vendor/inbox-v2/[rfqId]/print/page.tsx`
- `app/vendor/inbox-v2/page.tsx`
- `app/vendor/inbox/page.tsx`
- `app/vendor/page.tsx`
- `app/vendor/price-updates/new/page.tsx`

### Construction (3)

#### Journey: Build

- `app/construction-cost/[state]/[city]/page.tsx`
- `app/construction-cost/page.tsx`

#### Journey: Discover

- `app/cost-calculator/page.tsx`

### Dashboard / Manage (71)

#### Journey: Buy / Manage

- `app/dashboard/buyer/rfqs/[id]/page.tsx`
- `app/dashboard/buyer/rfqs/page.tsx`
- `app/dashboard/vendor/rfqs/[id]/page.tsx`
- `app/dashboard/vendor/rfqs/page.tsx`

#### Journey: Manage

- `app/dashboard/banker/page.tsx`
- `app/dashboard/builder/deal-rooms/[id]/page.tsx`
- `app/dashboard/builder/deal-rooms/page.tsx`
- `app/dashboard/buyer/chat/[conversationId]/page.tsx`
- `app/dashboard/buyer/enquiries/[rfqId]/quotes/page.tsx`
- `app/dashboard/buyer/enquiries/page.tsx`
- `app/dashboard/buyer/inbox/page.tsx`
- `app/dashboard/buyer/page.tsx`
- `app/dashboard/buyer/quote-compare/[rfqId]/chat/page.tsx`
- `app/dashboard/buyer/quote-compare/[rfqId]/page.tsx`
- `app/dashboard/buyer/quote-compare/[rfqId]/print/page.tsx`
- `app/dashboard/construction-projects/[id]/page.tsx`
- `app/dashboard/construction-projects/page.tsx`
- `app/dashboard/inbox-v2/page.tsx`
- `app/dashboard/inbox-v2/thread/[threadId]/page.tsx`
- `app/dashboard/inbox/page.tsx`
- `app/dashboard/investor/applications/page.tsx`
- `app/dashboard/investor/deal-rooms/[id]/page.tsx`
- `app/dashboard/investor/deal-rooms/page.tsx`
- `app/dashboard/investor/opportunities/[id]/page.tsx`
- `app/dashboard/investor/opportunities/page.tsx`
- `app/dashboard/investor/page.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/procurement-actions/page.tsx`
- `app/dashboard/procurement-analytics/page.tsx`
- `app/dashboard/procurement-anomaly/page.tsx`
- `app/dashboard/procurement-autonomous-tasks/page.tsx`
- `app/dashboard/procurement-briefing/page.tsx`
- `app/dashboard/procurement-closure-agent/page.tsx`
- `app/dashboard/procurement-control-tower/page.tsx`
- `app/dashboard/procurement-copilot/page.tsx`
- `app/dashboard/procurement-crisis-center/page.tsx`
- `app/dashboard/procurement-execution/page.tsx`
- `app/dashboard/procurement-followup-agent/page.tsx`
- `app/dashboard/procurement-health/page.tsx`
- `app/dashboard/procurement-heatmap/page.tsx`
- `app/dashboard/procurement-inbox-actions/page.tsx`
- `app/dashboard/procurement-live/page.tsx`
- `app/dashboard/procurement-memory-intelligence/page.tsx`
- `app/dashboard/procurement-mission-control/page.tsx`
- `app/dashboard/procurement-negotiation-agent/page.tsx`
- `app/dashboard/procurement-os/page.tsx`
- `app/dashboard/procurement-real-execution/page.tsx`
- `app/dashboard/procurement-situation-room/page.tsx`
- `app/dashboard/procurement-supplier-reliability/page.tsx`
- `app/dashboard/procurement-task-execution-log/page.tsx`
- `app/dashboard/procurement-timeline/page.tsx`
- `app/dashboard/procurement-war-room/page.tsx`
- `app/dashboard/subscription/boost/page.tsx`
- `app/dashboard/subscription/page.tsx`
- `app/dashboard/thread/[conversationId]/page.tsx`
- `app/dashboard/vendor/billing/page.tsx`
- `app/dashboard/vendor/chat/[conversationId]/page.tsx`
- `app/dashboard/vendor/dispatch/[dispatchId]/page.tsx`
- `app/dashboard/vendor/dispatch/page.tsx`
- `app/dashboard/vendor/enquiries/page.tsx`
- `app/dashboard/vendor/fleet/page.tsx`
- `app/dashboard/vendor/inbox/page.tsx`
- `app/dashboard/vendor/inventory-intelligence/page.tsx`
- ...and 7 more

### General (42)

#### Journey: Buy / Discover

- `app/search/[slug]/page.tsx`
- `app/search/error.tsx`
- `app/search/layout.tsx`
- `app/search/loading.tsx`
- `app/search/page.tsx`

#### Journey: Discover

- `app/about/page.tsx`
- `app/ai-search-guide/page.tsx`
- `app/banker/apply/page.tsx`
- `app/banking-finance-assistance/page.tsx`
- `app/blog/[slug]/page.tsx`
- `app/blog/edit/[id]/page.tsx`
- `app/blog/layout.tsx`
- `app/blog/my/page.tsx`
- `app/blog/new/page.tsx`
- `app/blog/page.tsx`
- `app/browserconfig.xml/route.ts`
- `app/compare-rates/page.tsx`
- `app/contact/page.tsx`
- `app/delivery-track/[dispatchId]/page.tsx`
- `app/emi-calculator/page.tsx`
- `app/enquiries/page.tsx`
- `app/founding-vendors/page.tsx`
- `app/house-construction-cost/[state]/[city]/page.tsx`
- `app/house-construction-cost/page.tsx`
- `app/inbox/page.tsx`
- `app/land-area-calculator/page.tsx`
- `app/layout.tsx`
- `app/logout/page.tsx`
- `app/offline/page.tsx`
- `app/page.tsx`
- `app/price-today/layout.tsx`
- `app/price-today/page.tsx`
- `app/privacy-policy/page.tsx`
- `app/refund-cancellation-policy/page.tsx`
- `app/settings/page.tsx`
- `app/support/layout.tsx`
- `app/support/my/page.tsx`
- `app/support/new/page.tsx`
- `app/support/ticket/[ticketId]/page.tsx`
- `app/terms-and-conditions/page.tsx`
- `app/test/[id]/page.tsx`

#### Journey: Grow

- `app/onboarding/business/page.tsx`

### Identity (6)

#### Journey: Discover

- `app/auth/awaiting-approval/page.tsx`
- `app/auth/callback/page.tsx`
- `app/auth/post-login/page.tsx`
- `app/auth/register-role/page.tsx`
- `app/login/page.tsx`
- `app/signup/page.tsx`

### Investment (4)

#### Journey: Discover

- `app/investment/layout.tsx`
- `app/investment/opportunities/[slug]/page.tsx`
- `app/investment/opportunities/page.tsx`
- `app/investment/page.tsx`

### Marketplace / Materials (7)

#### Journey: Discover

- `app/materials/[id]/page.tsx`
- `app/materials/error.tsx`
- `app/materials/layout.tsx`
- `app/materials/loading.tsx`
- `app/materials/my/page.tsx`
- `app/materials/page.tsx`

#### Journey: Sell / Grow

- `app/materials/add/page.tsx`

### Marketplace / Services (12)

#### Journey: Discover

- `app/services/[id]/page.tsx`
- `app/services/_archived/loading.tsx`
- `app/services/error.tsx`
- `app/services/layout.tsx`
- `app/services/my/page.tsx`
- `app/services/page.tsx`
- `app/services/providers/[slug]/page.tsx`
- `app/services/providers/page.tsx`
- `app/services/turnkey/[packageID]/page.tsx`
- `app/services/turnkey/add/page.tsx`
- `app/services/turnkey/page.tsx`

#### Journey: Sell / Grow

- `app/services/add/page.tsx`

### Procurement (16)

#### Journey: Buy / Discover

- `app/market-rfq/[slug]/page.tsx`
- `app/market-rfq/page.tsx`

#### Journey: Buy / Manage

- `app/buyer/rfq/[rfq_id]/compare/page.tsx`
- `app/materials/rfq/new/page.tsx`
- `app/rfq/browse/[module]/page.tsx`
- `app/rfq/general/browse/[module]/page.tsx`
- `app/rfq/general/new/error.tsx`
- `app/rfq/general/new/loading.tsx`
- `app/rfq/general/new/page.tsx`
- `app/rfq/general/page.tsx`
- `app/rfq/new/error.tsx`
- `app/rfq/new/loading.tsx`
- `app/rfq/new/page.tsx`
- `app/rfq/page.tsx`
- `app/rfq/start/page.tsx`
- `app/rfq/success/page.tsx`

### Property (16)

#### Journey: Discover

- `app/property/[id]/page.tsx`
- `app/property/builder/projects/[projectId]/units/add/page.tsx`
- `app/property/builder/projects/[projectId]/units/page.tsx`
- `app/property/builder/projects/add/page.tsx`
- `app/property/builder/projects/page.tsx`
- `app/property/edit/[id]/page.tsx`
- `app/property/error.tsx`
- `app/property/inventory/[slug]/page.tsx`
- `app/property/inventory/page.tsx`
- `app/property/layout.tsx`
- `app/property/loading.tsx`
- `app/property/my/page.tsx`
- `app/property/page.tsx`
- `app/property/projects/[slug]/page.tsx`
- `app/property/projects/page.tsx`

#### Journey: Sell / Grow

- `app/property/add/page.tsx`

### Rentals / Equipment (9)

#### Journey: Discover

- `app/rentals/[id]/page.tsx`
- `app/rentals/catalog/[id]/page.tsx`
- `app/rentals/catalog/page.tsx`
- `app/rentals/error.tsx`
- `app/rentals/layout.tsx`
- `app/rentals/loading.tsx`
- `app/rentals/my/page.tsx`
- `app/rentals/page.tsx`

#### Journey: Sell / Grow

- `app/rentals/add/page.tsx`

### SEO / Discovery (11)

#### Journey: Buy / Discover

- `app/market/[category]/[location]/page.tsx`
- `app/need/[slug]/page.tsx`
- `app/need/page.tsx`
- `app/seo-sitemap-categories.xml/route.ts`
- `app/seo-sitemap.xml/route.ts`
- `app/seo/[module]/[state]/[district]/[city]/[locality]/page.tsx`
- `app/seo/[module]/[state]/[district]/[city]/category/[category]/page.tsx`
- `app/seo/[module]/[state]/[district]/[city]/page.tsx`
- `app/seo/[module]/[state]/[district]/page.tsx`
- `app/seo/[module]/[state]/page.tsx`

#### Journey: Discover

- `app/location/[slug]/page.tsx`

## SAHAJ Execution Decision

3Bigha will not be redesigned page-by-page. Routes will be migrated by shared foundation, product domain, and human journey.

Priority migration order:

1. Shared Foundation
2. Procurement / RFQ
3. Search & Discovery
4. Property
5. Marketplace Materials & Services
6. Business / Vendor
7. Dashboard / Manage
8. Administration
