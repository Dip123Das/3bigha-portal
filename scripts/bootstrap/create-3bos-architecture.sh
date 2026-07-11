#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
DOCS_DIR="$ROOT_DIR/docs/3bos"

echo "======================================================"
echo "PROJECT NEEV — 3BOS ARCHITECTURE REPOSITORY"
echo "======================================================"

mkdir -p "$DOCS_DIR"

write_if_missing() {
  local target="$1"
  if [ -e "$target" ]; then
    echo "SKIPPED: ${target#$ROOT_DIR/}"
    cat >/dev/null
    return
  fi
  cat > "$target"
  echo "CREATED: ${target#$ROOT_DIR/}"
}

write_if_missing "$DOCS_DIR/README.md" <<'EOF'
# 3BOS — 3Bigha Business Operating System

3Bigha is the public platform.

3BOS is the Human-First Business Operating System powering identities,
workspaces, capabilities, Growth Plans, marketplace, business operations,
geography, trust, communication and enterprise services.

Project NEEV is the transformation programme through which the existing
production portal will progressively adopt 3BOS.

## Non-negotiable principles

- Dignity First
- Human First
- AI Second
- Precision Always
- Respect by Design
- Progressive Simplicity
- Invisible Technology
- Business Growth
- Production Stability
- Review Before Change

## Documents

1. [Constitution](./01-Constitution.md)
2. [Core Philosophy](./02-Core-Philosophy.md)
3. [Engine Architecture](./03-Engine-Architecture.md)
4. [Human Identity Engine](./04-Human-Identity-Engine.md)
5. [Workspace Engine](./05-Workspace-Engine.md)
6. [Capability Engine](./06-Capability-Engine.md)
7. [Business Growth Engine](./07-Business-Growth-Engine.md)
8. [Human Experience Engine](./08-Human-Experience-Engine.md)
9. [Language Dictionary](./09-Language-Dictionary.md)
10. [AI Philosophy](./10-AI-Philosophy.md)
11. [Database Architecture](./11-Database-Architecture.md)
12. [Permission Architecture](./12-Permission-Architecture.md)
13. [Geography Engine](./13-Geography-Engine.md)
14. [Trust Engine](./14-Trust-Engine.md)
15. [Marketplace Engine](./15-Marketplace-Engine.md)
16. [Communication Engine](./16-Communication-Engine.md)
17. [Enterprise Engine](./17-Enterprise-Engine.md)
18. [Implementation Standards](./18-Implementation-Standards.md)
19. [Migration Strategy](./19-Migration-Strategy.md)
20. [Roadmap](./20-Roadmap.md)

## Governing rule

No production implementation proceeds until the existing file, dependencies,
database impact, permissions, human journey, validation and rollback have been reviewed.
EOF

write_if_missing "$DOCS_DIR/01-Constitution.md" <<'EOF'
# 3BOS Constitution

## Dignity First

Every person, profession and business deserves respect.

## Human First

Technology must adapt to people. People must not be forced to understand software.

## AI Second

AI prepares. Humans review, approve and decide.

## Precision Always

Simplicity must never reduce professional accuracy or reliability.

## Respect by Design

Every label, button, message, error, empty state and notification must preserve dignity.

## Progressive Simplicity

Show only what is relevant to the person, identity, workspace and present task.

## Invisible Technology

Technical architecture should remain in the background.

## Identity Is Not a Subscription

A person remains a Builder, Architect, Banker, Property Owner, Material Business,
Investor or Skilled Workforce regardless of Growth Plan.

## Marketplace Is a Capability

3Bigha is a Business Operating System with an integrated Marketplace.

## Direct Business Relationships

Customers pay businesses directly. Revenue comes from Growth Plans, business tools,
AI services, promotions and enterprise services.

## Production Stability

Preserve existing working functionality through compatibility layers and safe migration.

## Review Before Change

No existing production file may be modified before it is fully reviewed.

## Constitutional test

Every implementation must answer:

1. Does this respect human dignity?
2. Would a first-time internet user understand it?
3. Does this reduce confusion and effort?
4. Does AI remain appropriately invisible?
5. Does this help the person or business grow?
6. Is the result precise and trustworthy?
7. Is production stability protected?
EOF

write_if_missing "$DOCS_DIR/02-Core-Philosophy.md" <<'EOF'
# Core Philosophy

## Human First. AI Second. Precision Always.

```text
A human expresses a real need
        ↓
3BOS understands the context
        ↓
The platform prepares structured work
        ↓
The human reviews
        ↓
The human decides
```

3Bigha is not merely a property portal, marketplace, ERP, inventory tool,
RFQ system or AI product.

3Bigha is a Human-First Business Operating System for construction, property,
local business, professionals, finance and related economic activity.

The database must serve the human. The human must never be forced to serve
the database structure.
EOF

write_if_missing "$DOCS_DIR/03-Engine-Architecture.md" <<'EOF'
# Engine Architecture

Every feature must have a clear owner.

## Core engines

- Identity Engine
- Workspace Engine
- Capability Engine
- Business Growth Engine
- Marketplace Engine
- AI Engine
- Geography Engine
- Trust Engine
- Communication Engine
- Enterprise Engine
- Human Experience Engine

Every feature must eventually identify:

- owning engine;
- capability;
- identities served;
- workspace placement;
- Growth Plan level;
- permission rule;
- database and API ownership;
- user-facing language;
- mobile and desktop behaviour.
EOF

write_if_missing "$DOCS_DIR/04-Human-Identity-Engine.md" <<'EOF'
# Human Identity Engine

The Identity Engine represents people and organisations as they understand
themselves, not as technical roles or subscription classes.

## Separate concepts

```text
Authentication
Access role
Human identity
Business activities
Capabilities
Growth Plan
Permissions
Workspace
```

## Multi-identity principle

A person may be a Builder, Property Owner, Material Business, Investor and
Author at the same time.

## Identity families

### Property and Real Estate
Property Owner, Land Owner, Builder, Developer, Real Estate Consultant,
Broker, Housing Society.

### Construction
Construction Business, Contractor, Civil Contractor, Electrical Contractor,
Plumbing Contractor, Interior Contractor, Road Contractor.

### Materials and Supply Chain
Material Business, Manufacturer, Dealer, Distributor, Wholesaler, Retail Business.

### Equipment and Machinery
Rental Business, Equipment Owner, Machine Operator.

### Professional Services
Architect, Engineer, Structural Engineer, Surveyor, Interior Designer,
Project Management Consultant, Valuation Professional, Environmental Consultant.

### Legal and Compliance
Lawyer, Chartered Accountant, Company Secretary, Tax Consultant, GST Consultant.

### Finance and Investment
Banker, Financial Institution, Lender, Loan Consultant, Investor, Insurance Advisor.

### Skilled Workforce
Mason, Carpenter, Electrician, Plumber, Painter, Fabricator, Welder,
Tile Installer, Steel Fixer, Bar Bender, Supervisor, Machine Operator.

### Logistics
Transport Business, Fleet Owner, Crane Service, Delivery Partner.

### Agriculture and Rural Economy
Farmer, Land Owner, Agriculture Business, Nursery, Irrigation Specialist.

### Government and Public Institutions
Government Department, Municipality, Panchayat, Development Authority, PSU.

### Knowledge and Media
Author, Trainer, Researcher, Institution, Knowledge Creator.

## Legacy compatibility

Existing values such as `vendor`, `hub_vendor`, `builder`, `buyer`, `blogger`
and `vendor_module_grants` remain compatibility inputs during migration.
EOF

write_if_missing "$DOCS_DIR/05-Workspace-Engine.md" <<'EOF'
# Workspace Engine

A workspace is where a person performs work connected to an identity.

Examples:

- Property Workspace
- Builder Workspace
- Contractor Workspace
- Material Business Workspace
- Rental Business Workspace
- Architect Workspace
- Engineer Workspace
- Legal Professional Workspace
- Banker Workspace
- Financial Institution Workspace
- Investment Workspace
- Skilled Workforce Workspace
- Author Workspace
- Government Workspace

A workspace is composed from relevant capabilities and should reveal complexity
progressively according to identity, Growth Plan, permission, task and device.

The homepage remains customer-first. Workspaces are entered after login or
through “Manage My Business.”
EOF

write_if_missing "$DOCS_DIR/06-Capability-Engine.md" <<'EOF'
# Capability Engine

Every functional feature belongs to a registered capability.

## Primary capabilities

- Marketplace
- Inventory
- Billing
- Business Operations
- Customer Relationships
- Requirements and Quotations
- Intelligent Assistance
- Business Insights
- Business Promotion
- Enterprise Management
- Communication
- Trust and Verification
- Knowledge and Publishing

Actual access is resolved from:

```text
Identity eligibility
× Growth Plan level
× Permission
× Workspace context
× Feature availability
```

A Growth Plan must never expose irrelevant complexity.
EOF

write_if_missing "$DOCS_DIR/07-Business-Growth-Engine.md" <<'EOF'
# Business Growth Engine

Growth Plans represent progress, not social status.

| Legacy concept | Human growth stage |
|---|---|
| Basic | Start |
| Growth | Grow |
| Professional | Manage |
| Business Pro | Scale |

| Capability | Start | Grow | Manage | Scale |
|---|---|---|---|---|
| Business Profile | Included | Included | Included | Included |
| Inventory | Basic | Full | Advanced | Unlimited |
| Billing | Basic | Professional | Operations-connected | Enterprise |
| Intelligent Assistance | Limited | Standard | Advanced | Premium |
| RFQ Access | Limited | High | Priority | Highest |
| Business Insights | None | Basic | Advanced | Executive |
| Team Members | 1 | 3 | 10 | Unlimited |
| Branches | 1 | 1 | 3 | Unlimited |
| Marketplace Visibility | Standard | Enhanced | High | Premium |

The platform encourages growth without diminishing Start-stage users.
EOF

write_if_missing "$DOCS_DIR/08-Human-Experience-Engine.md" <<'EOF'
# Human Experience Engine

The Human Experience Engine governs everything a person sees, reads, touches
or experiences.

It owns:

- language;
- information order;
- progressive disclosure;
- forms and onboarding;
- navigation;
- mobile and desktop behaviour;
- accessibility;
- loading, empty, success and error states;
- notifications;
- AI visibility;
- first-time user usability.

Forms should follow natural thinking:

```text
Who are you?
What do you do?
Where do you work?
How can people contact you?
What verification is necessary?
Please review.
```

The interface must not mirror database column order.
EOF

write_if_missing "$DOCS_DIR/09-Language-Dictionary.md" <<'EOF'
# Language Dictionary

| Avoid publicly | Use contextually |
|---|---|
| Vendor | Business, Material Business, Contractor, Builder, Professional, Rental Business, Property Owner |
| Seller | Property Owner, Material Business, Business |
| Service Provider | Professional, Contractor, Skilled Workforce |
| Labourer | Skilled Workforce or specific trade |
| Dashboard | Workspace, My Work, Business Overview |
| Package | Business Growth Plan |
| Free User | Start Plan |
| Premium User | Grow, Manage or Scale Plan |
| Vendor Hub | My Workspaces or Multi-Business Workspace |
| ERP | Business Operations |
| CRM | Customer Relationships |
| Analytics | Business Insights |
| AI Assistant | Usually omit; Intelligent Assistance only when necessary |
| AI Check | Check, Verify or Review |
| AI-generated | Prepared for your review |
| Invalid input | Please review the highlighted information |
| Failed | Could not complete this yet |

There is no single universal replacement for “vendor.” The correct visible
identity must be resolved from context.
EOF

write_if_missing "$DOCS_DIR/10-AI-Philosophy.md" <<'EOF'
# AI Philosophy

AI prepares. Humans approve.

AI may understand natural language, reduce repetitive entry, prepare drafts,
check consistency, suggest missing information, identify risk and support decisions.

AI must not silently make binding business decisions, publish, pay, replace
professional judgement, create AI-only workflows or fabricate confidence.

AI should normally remain invisible.

Use:

- “We are preparing your requirement.”
- “Please review these details.”
- “We found a possible mismatch.”
- “Here is a suggested response.”
EOF

write_if_missing "$DOCS_DIR/11-Database-Architecture.md" <<'EOF'
# Database Architecture

Database structure must support human identities and workflows without forcing
the interface to mirror technical tables.

The system must distinguish:

- authentication account;
- access role;
- person or organisation;
- human identities;
- business activities;
- workspace membership;
- capability entitlement;
- Growth Plan;
- team permissions;
- verification;
- marketplace records;
- operational records.

Existing structures including `profiles`, `business_profiles`,
`vendor_module_grants`, subscription fields and payment records remain
operational during migration.

No new table is created before schema, ownership, RLS, indexes, migration,
compatibility and rollback are reviewed.
EOF

write_if_missing "$DOCS_DIR/12-Permission-Architecture.md" <<'EOF'
# Permission Architecture

Permissions must distinguish:

1. Authentication
2. Internal access role
3. Human identity
4. Workspace membership
5. Capability entitlement
6. Growth Plan level
7. Team permission
8. Record ownership
9. Administrative authority

Human identity and Growth Plan must never grant administrative authority.

Users must not self-assign protected roles. Approval fields must be
server-controlled. Browser authority must remain minimal. Every new table
requires RLS review.
EOF

write_if_missing "$DOCS_DIR/13-Geography-Engine.md" <<'EOF'
# Geography Engine

The Geography Engine gives every requirement, business, listing, service area
and delivery location an accurate national geographic identity.

It owns:

- LGD geography;
- states, districts, subdivisions and blocks;
- local bodies, villages and localities;
- postal data;
- coordinates and H3;
- maps and exact locations;
- distance and nearby discovery;
- service areas and delivery addresses.

Official administrative geography and exact map coordinates serve different
purposes and should be preserved together.
EOF

write_if_missing "$DOCS_DIR/14-Trust-Engine.md" <<'EOF'
# Trust Engine

Trust is earned through transparent evidence, not purchased through a plan label.

Trust signals include identity, business, professional, document and location
verification; response reliability; work and delivery history; feedback;
disputes; activity; freshness and compliance.

A new business is not an untrustworthy business.

Paid visibility and trust verification must remain separate.
EOF

write_if_missing "$DOCS_DIR/15-Marketplace-Engine.md" <<'EOF'
# Marketplace Engine

The Marketplace Engine connects real needs with relevant businesses,
professionals, properties, materials, rentals and opportunities.

It owns discovery, search, nearby results, listings, requirements, RFQs,
quotation comparison, enquiries, matching, visibility and market intelligence.

Marketplace is one capability of 3BOS, not the whole identity of 3Bigha.

Commercial promotion must be clearly distinguished from organic relevance.
EOF

write_if_missing "$DOCS_DIR/16-Communication-Engine.md" <<'EOF'
# Communication Engine

The Communication Engine supports respectful, timely and traceable communication.

Channels include in-platform messages, RFQ discussions, notifications, email,
SMS, WhatsApp and push notifications.

Communication must preserve context, avoid duplication, respect preferences,
identify required action, avoid fear-based urgency, support multilingual use
and protect personal data.

AI may prepare replies and summaries. Humans review before sending unless a
safe, explicit automation has been enabled.
EOF

write_if_missing "$DOCS_DIR/17-Enterprise-Engine.md" <<'EOF'
# Enterprise Engine

The Enterprise Engine supports organisations with multiple people, branches,
departments or operating units.

It owns teams, members, branches, departments, roles, permissions, approval
chains, shared records, organisation reporting and audit trails.

Initial direction:

- Start: 1 member, 1 branch
- Grow: 3 members, 1 branch
- Manage: 10 members, 3 branches
- Scale: flexible enterprise limits

Enterprise permissions remain independent of public human identity.
EOF

write_if_missing "$DOCS_DIR/18-Implementation-Standards.md" <<'EOF'
# Implementation Standards

Before modifying an existing file:

1. Read the complete relevant file.
2. Identify its responsibility.
3. Review imports and dependencies.
4. Review database calls.
5. Review APIs and routes.
6. Review permission assumptions.
7. Review mobile and desktop effects.
8. Identify what must be preserved.
9. Define the smallest safe change.
10. Prepare validation and rollback.

Avoid duplicate logic, uncontrolled global CSS, blind replacement and unsafe
renaming. Preserve stable internal values through compatibility adapters.

Run type checks and production builds. Inspect the final diff before committing.
EOF

write_if_missing "$DOCS_DIR/19-Migration-Strategy.md" <<'EOF'
# Migration Strategy

3BOS will be introduced progressively over the existing production portal.

Preserve initially:

- authentication;
- access roles;
- routes;
- module grants;
- business profiles;
- listings and workflows;
- payment records;
- APIs;
- geography systems.

Introduce progressively:

1. Architecture documentation
2. Identity compatibility layer
3. Human identity storage
4. Identity-aware onboarding
5. Workspace composition
6. Growth Plan compatibility
7. Capability resolution
8. Contextual language
9. Progressive navigation
10. Module-by-module transformation

Transform complete journeys vertically:

```text
Identity
→ Onboarding
→ Workspace
→ Capability
→ Navigation
→ Permissions
→ Validation
```
EOF

write_if_missing "$DOCS_DIR/20-Roadmap.md" <<'EOF'
# 3BOS Transformation Roadmap

## NEEV-0 — Foundation and Audit
Architecture, role, permission, onboarding, entitlement and security review.

## NEEV-1 — Human Identity Engine
Identity registry, storage, compatibility resolver, multi-identity and onboarding.

## NEEV-2 — Homepage Transformation
Customer-first journeys and Business Operating System positioning.

## NEEV-3 — Workspace Architecture
My Workspaces, identity-specific composition and switching.

## NEEV-4 — Business Growth Engine
Start, Grow, Manage and Scale with legacy compatibility.

## NEEV-5 — Capability Engine
Registry, identity matrix, entitlement resolver and feature ownership.

## NEEV-6 — Progressive UI
Identity-aware visibility, task-based screens and mobile-first disclosure.

## NEEV-7 — Human Dignity Audit
Platform-wide language, errors, empty states, notifications and messages.

## NEEV-8 — AI Integration
Invisible assistance, human approval and safe automation.

## NEEV-9 — Business Growth Experience
Insights, opportunities, recommendations and workspace progress.

## NEEV-10 — Final Production Audit
Architecture, security, accessibility, performance, SEO and rollback readiness.
EOF

echo
echo "Architecture files:"
find "$DOCS_DIR" -maxdepth 1 -type f -printf '%f\n' | sort

echo
echo "Total:"
find "$DOCS_DIR" -maxdepth 1 -type f | wc -l

echo
echo "Git status:"
git status --short