"use client";

import { create } from "zustand";

export type MobileOperationalNotification = {
  id: string;

  title: string;
  body: string;

  category: string;

  url?: string;

  createdAt: number;
};

type Store = {
  notifications: MobileOperationalNotification[];

  unreadCount: number;

  lastSilentSyncAt: number | null;

  categoryUnread: Record<string, number>;

  push: (notification: MobileOperationalNotification) => void;

  registerSilentSync: (category?: string) => void;

  remove: (id: string) => void;

  markAllRead: () => void;

  clear: () => void;
};

export const useMobileNotificationStore = create<Store>((set) => ({
  notifications: [],

  unreadCount: 0,

  lastSilentSyncAt: null,

  categoryUnread: {},

  push: (notification) =>
    set((state) => ({
      notifications: [
        notification,
        ...state.notifications.slice(0, 4),
      ],

      unreadCount: state.unreadCount + 1,

      categoryUnread: {
        ...state.categoryUnread,
        [notification.category]:
          (state.categoryUnread[notification.category] || 0) + 1,
      },
    })),

  registerSilentSync: (category = "silent_sync") =>
    set((state) => ({
      lastSilentSyncAt: Date.now(),

      categoryUnread: {
        ...state.categoryUnread,
        [category]: state.categoryUnread[category] || 0,
      },
    })),

  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(
        (x) => x.id !== id
      ),
    })),

  markAllRead: () =>
    set({
      unreadCount: 0,
      categoryUnread: {},
    }),

  clear: () =>
    set({
      notifications: [],
      unreadCount: 0,
      categoryUnread: {},
    }),
}));