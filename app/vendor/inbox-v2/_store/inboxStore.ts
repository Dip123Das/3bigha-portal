import { create } from "zustand";

export type InboxRow = {
  rfq_id: string;
  is_unread: boolean; // coming from view
  [k: string]: any;
};

type PendingMap = Record<string, { type: "mark_read" | "bulk_mark_read"; at: number }>;

type InboxState = {
  rows: InboxRow[];
  pending: PendingMap;

  total: number;
  unread: number;

  hydrate: (rows: InboxRow[]) => void;

  // optimistic actions
  markReadOptimistic: (rfqId: string) => { changed: boolean };
  rollbackMarkRead: (rfqId: string) => void;

  bulkMarkReadOptimistic: (rfqIds: string[]) => { changedIds: string[] };
  rollbackBulkMarkRead: (rfqIds: string[]) => void;

  patchRow: (rfqId: string, patch: Partial<InboxRow>) => void;

  // realtime helpers
  replaceRow: (row: InboxRow) => void;
  upsertRowTop: (row: InboxRow) => void;
};

function calcUnread(rows: InboxRow[]) {
  let unread = 0;
  for (const r of rows) if (r.is_unread) unread++;
  return unread;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  rows: [],
  pending: {},
  total: 0,
  unread: 0,

  hydrate: (rows) =>
    set({
      rows,
      total: rows.length,
      unread: calcUnread(rows),
      pending: {},
    }),

  patchRow: (rfqId, patch) => {
    const { rows } = get();
    let changed = false;

    const next = rows.map((r) => {
      if (r.rfq_id !== rfqId) return r;
      changed = true;
      return { ...r, ...patch };
    });

    if (!changed) return;
    set({ rows: next, unread: calcUnread(next), total: next.length });
  },

  replaceRow: (row) => {
    const { rows } = get();
    const idx = rows.findIndex((r) => r.rfq_id === row.rfq_id);
    if (idx === -1) return;

    const next = rows.slice();
    next[idx] = { ...rows[idx], ...row };
    set({ rows: next, unread: calcUnread(next), total: next.length });
  },

  upsertRowTop: (row) => {
    const { rows } = get();
    const idx = rows.findIndex((r) => r.rfq_id === row.rfq_id);

    let next: InboxRow[];
    if (idx === -1) {
      next = [row, ...rows];
    } else {
      const copy = rows.slice();
      const existing = copy[idx];
      copy.splice(idx, 1);
      next = [{ ...existing, ...row }, ...copy];
    }

    set({ rows: next, unread: calcUnread(next), total: next.length });
  },

  markReadOptimistic: (rfqId) => {
    const { rows, pending } = get();
    const row = rows.find((r) => r.rfq_id === rfqId);
    if (!row) return { changed: false };
    if (!row.is_unread) return { changed: false };

    const next = rows.map((r) => (r.rfq_id === rfqId ? { ...r, is_unread: false } : r));

    set({
      rows: next,
      unread: calcUnread(next),
      total: next.length,
      pending: { ...pending, [rfqId]: { type: "mark_read", at: Date.now() } },
    });

    return { changed: true };
  },

  rollbackMarkRead: (rfqId) => {
    const { rows, pending } = get();
    if (!pending[rfqId]) return;

    const next = rows.map((r) => (r.rfq_id === rfqId ? { ...r, is_unread: true } : r));
    const nextPending = { ...pending };
    delete nextPending[rfqId];

    set({ rows: next, unread: calcUnread(next), total: next.length, pending: nextPending });
  },

  bulkMarkReadOptimistic: (rfqIds) => {
    const { rows, pending } = get();
    const idSet = new Set(rfqIds);

    const changedIds: string[] = [];
    const next = rows.map((r) => {
      if (!idSet.has(r.rfq_id)) return r;
      if (!r.is_unread) return r;
      changedIds.push(r.rfq_id);
      return { ...r, is_unread: false };
    });

    if (changedIds.length === 0) return { changedIds: [] };

    const nextPending = { ...pending };
    for (const id of changedIds) nextPending[id] = { type: "bulk_mark_read", at: Date.now() };

    set({ rows: next, unread: calcUnread(next), total: next.length, pending: nextPending });
    return { changedIds };
  },

  rollbackBulkMarkRead: (rfqIds) => {
    const { rows, pending } = get();
    const idSet = new Set(rfqIds);

    const next = rows.map((r) => {
      if (!idSet.has(r.rfq_id)) return r;
      if (!pending[r.rfq_id]) return r;
      return { ...r, is_unread: true };
    });

    const nextPending = { ...pending };
    for (const id of rfqIds) delete nextPending[id];

    set({ rows: next, unread: calcUnread(next), total: next.length, pending: nextPending });
  },
}));