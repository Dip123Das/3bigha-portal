import type { RealtimeChannel } from "@supabase/supabase-js";

type StoredChannel = {
  channel: RealtimeChannel;
  refs: number;
};

const channelStore = new Map<string, StoredChannel>();

export function getSharedChannel(
  key: string,
  factory: () => RealtimeChannel
): RealtimeChannel {
  const existing = channelStore.get(key);

  if (existing) {
    existing.refs += 1;
    return existing.channel;
  }

  const channel = factory();
  channelStore.set(key, { channel, refs: 1 });

  return channel;
}

export function releaseSharedChannel(
  key: string,
  remover?: (channel: RealtimeChannel) => void
) {
  const existing = channelStore.get(key);
  if (!existing) return;

  existing.refs -= 1;

  if (existing.refs > 0) return;

  try {
    remover?.(existing.channel);
  } finally {
    channelStore.delete(key);
  }
}

export function getSharedChannelCount() {
  return channelStore.size;
}
