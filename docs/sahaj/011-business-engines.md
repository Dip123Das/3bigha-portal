# 011 — Business Engines

Project SAHAJ organizes 3Bigha as a platform of business engines, not as isolated pages or folders.

## Why Business Engines

3Bigha has hundreds of routes and many modules. To keep the platform understandable and scalable, every capability must belong to a clear business engine.

Human journeys use these engines. Routes are only implementation details.

## Canonical Engines

### 1. Identity Engine

Owns users, authentication, profiles, roles, permissions and account context.

Supports all journeys.

### 2. Geography Engine

Owns LGD hierarchy, PIN intelligence, coordinates, Google Maps, nearby search, service radius and distance calculation.

Supports: Build, Buy, Sell, Hire, Manage, Grow.

### 3. Property Engine

Owns land, property listings, projects, property search, property add/edit, inventory and real estate workflows.

Supports: Buy, Sell, Build, Manage.

### 4. Marketplace Engine

Owns materials, services, rentals, vendors, suppliers, listings, nearby marketplace discovery and inventory.

Supports: Buy, Hire, Rent, Grow, Manage.

### 5. Procurement Engine

Owns RFQ, quotations, vendor matching, negotiation, purchase intent, delivery discussions and procurement tracking.

Supports: Buy, Manage, Build.

### 6. Construction Engine

Owns construction cost, BOQ, estimate, drawings, execution, project progress, construction health and recovery workflows.

Supports: Build, Manage.

### 7. Intelligence Engine

Owns AI, marketplace intelligence, vendor intelligence, demand/supply intelligence, predictions, recommendations, automation, memory and learning.

Supports all journeys, but should remain invisible by default for normal users.

### 8. Business Engine

Owns business onboarding, vendor profiles, ERP, billing, dispatch, performance, subscriptions, growth and business verification.

Supports: Grow, Manage, Sell, Hire.

### 9. Operations Engine

Owns notifications, cron jobs, monitoring, alerts, analytics, support, system health and operational continuity.

Supports: Manage, Administration.

### 10. Administration Engine

Owns master data, taxonomy, moderation, approvals, configuration, user management, SEO operations and platform governance.

Supports: Manage, Configure.

## Human Journey Relationship

| Human Journey | Primary Engines |
|---|---|
| Build | Geography, Construction, Property, Marketplace, Procurement, Intelligence |
| Buy | Search/Marketplace, Property, Procurement, Geography, Intelligence |
| Sell | Property, Marketplace, Business, Geography |
| Hire | Marketplace, Business, Geography, Procurement |
| Manage | Procurement, Construction, Business, Operations, Administration |
| Learn | Intelligence, Geography, Property, Construction |
| Grow | Business, Marketplace, Intelligence, Geography |

## Architecture Rule

No new feature should be approved unless it declares:

1. Business engine
2. Human journey
3. Primary user
4. Shared SAHAJ foundation components used
5. AI visibility level
6. Location precision requirement

## Migration Rule

Existing routes will be migrated gradually from folder-based UX to journey-based UX.

Priority order:

1. Shared SAHAJ Foundation
2. Procurement Engine / RFQ
3. Geography Engine / Location foundation
4. Marketplace Engine
5. Property Engine
6. Business Engine
7. Construction Engine
8. Dashboard / Manage journeys
9. Administration Engine
10. Intelligence Engine visibility cleanup
