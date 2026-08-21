# 3Bigha Inventory Domain Contract

**Workstream:** Inventory Intelligence OS  
**Phase:** INV-01 — Inventory Domain Contract and Stock Integrity Baseline  
**Status:** Canonical architecture contract  
**Principle:** Human First. AI Second. Precision Always.

## 1. Purpose

This contract governs the existing 3Bigha inventory architecture.

It does not create a new inventory system. It consolidates the inventory capabilities already implemented through VCOS, COST, procurement integration and INV-02 through INV-06.

All future inventory development must preserve this contract.

## 2. Non-duplication rule

3Bigha must not create a parallel:

- material identity table;
- physical stock balance;
- stock transaction ledger;
- reservation ledger;
- available-to-sell calculation;
- location allocation model;
- billing deduction path;
- dispatch deduction path;
- marketplace availability formula;
- mobile stock authority.

Existing canonical inventory capabilities must be extended rather than rebuilt.

## 3. Canonical material identity

The authoritative material identity is:

`public.material_listings`

A vendor material becomes an inventory item through:

`material_listings.attributes.inventory`

The material listing remains shared with Marketplace, RFQ, Vendor ERP, Billing, Dispatch, Construction OS, Procurement and Inventory Intelligence.

## 4. Physical stock authority

The operational physical stock balance remains:

`material_listings.attributes.inventory.current_stock`

This compatibility projection must change only through an approved server-side inventory command.

The canonical material stock posting command is:

`public.post_bos_material_inventory_transaction(...)`

Direct browser or application overwrites of `current_stock` are prohibited.

## 5. Transaction authority

The authoritative semantic audit ledger is:

`public.bos_inventory_transactions`

It records:

- inventory entity;
- transaction type;
- signed quantity;
- unit;
- stock before and after;
- source module and reference;
- cost metadata;
- idempotency key;
- actor and occurrence time.

The material balance and its ledger transaction must be updated atomically.

Ledger history must not be destructively rewritten. Corrections require authorised reversal or reconciliation transactions.

## 6. Physical stock equation

Physical stock follows:

`Opening stock + inbound movements - outbound movements ± approved adjustments = physical on-hand stock`

Neutral transactions, including reservations and reservation releases, do not change physical on-hand stock.

Approved commands must prevent physical stock from becoming negative.

## 7. Reservation authority

The authoritative material reservation store is:

`public.bos_material_inventory_reservations`

Canonical reservation commands include:

- `public.reserve_bos_material_inventory(...)`
- `public.release_bos_material_inventory_reservation(...)`

Reservations are subordinate commitments. They do not change physical stock.

Direct browser writes to reservation quantities, status or lifecycle fields are prohibited.

## 8. Available-to-sell authority

The authoritative material availability projection is:

`public.bos_material_available_to_sell`

The governing formula is:

`Available to Sell = Physical On Hand - Active Unreleased Reservations`

Expired, cancelled, consumed and fully released reservations do not reduce available-to-sell.

Marketplace, RFQ, Billing, Mobile and Inventory Intelligence must not independently calculate conflicting availability.

## 9. Location authority

Location allocations are subordinate to material inventory.

Location-level totals must reconcile to physical on-hand stock.

An internal transfer must:

- be atomic;
- preserve total vendor-owned stock;
- create traceable transfer records;
- use approved location-transfer functions;
- never create or destroy quantity.

## 10. Reconciliation authority

Physical reconciliation is a human-controlled operation.

It must capture the counted quantity, calculate the variance, retain the before-and-after balances and create an authorised adjustment transaction.

AI may identify or explain a variance. AI must not silently approve or post a reconciliation adjustment.

## 11. Billing authority

Billing must use the existing canonical sales integration.

An approved sales operation must:

- validate ownership;
- validate available-to-sell;
- consume a linked reservation where applicable;
- post stock-out exactly once;
- use idempotency;
- retain the billing reference.

Draft bills, quotations and estimates must not reduce stock.

## 12. Dispatch authority

Dispatch must not independently deduct stock when Billing or the canonical sales command has already posted the stock-out.

Changing Dispatch into the stock event requires a formal architecture decision and a regression test preventing double deduction.

## 13. Construction and COST authority

Owned-material consumption by Construction OS and COST must use:

`public.post_bos_cost_stock_consumption(...)`

That function must delegate physical stock mutation to:

`public.post_bos_material_inventory_transaction(...)`

Planning, BOQ creation and procurement intention do not reduce stock.

## 14. Procurement authority

Procurement intelligence, recommendations and forecasts do not create stock.

Physical stock increases only after an approved receipt event, including purchase receipt, production receipt, return, opening stock or positive reconciliation.

Procurement modules must not maintain a separate physical stock balance.

## 15. Marketplace and RFQ

Publication and availability are different concepts.

Marketplace and RFQ must use canonical available-to-sell whenever a commercial quantity is being promised.

A quote does not reduce physical stock. An accepted commercial event may create a canonical reservation.

## 16. Inventory Intelligence

Inventory Intelligence is advisory.

AI may summarise, explain, forecast, prioritise and recommend.

AI must not:

- overwrite physical stock;
- create hidden reservations;
- approve reconciliation;
- bypass RLS;
- bypass canonical commands;
- invent availability;
- become the source of truth.

Legacy `inventory_stock_movements` may remain a compatibility read until formally migrated, but it is not a competing stock authority.

## 17. Security and tenancy

Every inventory operation must be:

- authenticated;
- vendor-scoped;
- RLS-protected;
- ownership-validated;
- atomic;
- auditable;
- idempotent where retryable.

Application filtering does not replace RLS.

## 18. Idempotency

Retryable operations must use stable idempotency keys.

Network retries, mobile retries, duplicate clicks and repeated external callbacks must not create duplicate stock movements.

## 19. Units

Every quantity operation must respect the inventory item’s canonical stock unit.

Conflicting units must fail unless an approved central conversion rule exists.

Silent UI-level unit conversion is prohibited.

## 20. Domain boundaries

### Materials

Quantity-based physical inventory uses the canonical material stock authority.

### Property

Property availability, ownership and booking remain a unique-asset domain adapter. Property must not be forced into ordinary material quantity movements.

### Rentals

Rental availability remains a reusable-asset and time-window domain adapter. Rental dispatch, return, condition and maintenance must not be represented as ordinary material sales.

Shared concepts may include availability, reservation, release, location and audit events, while domain-specific state remains separate.

## 21. Required invariants

1. Material identity is not duplicated.
2. Approved commands cannot create negative physical stock.
3. Reservations cannot exceed available-to-sell.
4. Reservations do not change physical stock.
5. Internal transfers preserve total physical stock.
6. Reconciliation creates an auditable adjustment.
7. Billing cannot deduct the same stock twice.
8. Dispatch cannot duplicate a completed sale deduction.
9. COST consumption delegates to canonical stock posting.
10. Every operation is tenant-scoped.
11. Retried operations are idempotent.
12. AI cannot mutate authoritative stock.
13. Marketplace promises cannot exceed available-to-sell.
14. Location totals reconcile to physical stock.
15. Existing integrations and public routes remain compatible.

## 22. Change-control questions

Every inventory change must identify:

- the canonical entity affected;
- the authorised mutation command;
- the ledger event created;
- the idempotency strategy;
- the applicable RLS policy;
- the availability projection affected;
- the integrations consuming the result;
- the regression test preventing duplication;
- the compatibility fields retained;
- the production-verification method.

A change that cannot answer these questions must not be merged.

## 23. INV-01 exit gate

INV-01 is complete only when:

- this contract is committed;
- the consolidated verifier passes;
- all existing INV and COST inventory checks pass;
- TypeScript passes;
- the production build passes;
- no unauthorised direct stock writer exists;
- the branch is reviewed and merged;
- deployment and production verification succeed.
