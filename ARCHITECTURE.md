# 3Bigha Construction Intelligence Operating System

3Bigha is evolving from a marketplace into a Construction Intelligence Operating System.

## Core Principle

All marketplace intelligence should follow this flow:

Database
→ Service Layer
→ Executive Adapter
→ Signal Aggregator
→ Autonomous Marketplace Executive
→ Decision Engine
→ Action Engine

## Subsystems

- Geography OS
- Marketplace OS
- Vendor OS
- Procurement OS
- Property OS
- SEO OS
- Analytics OS
- Executive AI Layer

## Service Layer Rule

Services own reusable business logic and data access.

API routes, cron jobs, dashboards, and executive adapters should call services instead of duplicating logic.

## Adapter Rule

Adapters translate service output into normalized `AmeSignal[]`.

The Executive should not know database schema details or individual engine internals.

## Executive Rule

The Autonomous Marketplace Executive consumes only normalized signals.

It is responsible for:

- signal aggregation
- prediction
- decision-making
- memory
- learning
- action planning

Action planning and action execution must remain separate.

## AME Version Roadmap

- AME v1: Executive framework, signal aggregation, adapter framework
- AME v2: Live adapters and weighted decisions
- AME v3: Persistent memory and learning
- AME v4: Autonomous orchestration
- AME v5: Multi-agent construction intelligence

## Production Safety

All changes must be incremental, testable, and deployable independently.

Existing workflows must not be broken while the Executive is being introduced.
