import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  loadVendorWorkspace,
  type VendorConversation,
  type VendorNotification,
  type VendorWorkspace,
} from "@/features/vendor/api";
import { VendorConversationScreen } from "@/features/vendor/VendorConversationScreen";
import { colors, radii, spacing, typography } from "@/theme/tokens";

function readableTime(value: string | null) {
  if (!value) return "Time unavailable";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Time unavailable";

  return parsed.toLocaleString();
}

function NotificationCard({
  notification,
}: {
  notification: VendorNotification;
}) {
  return (
    <View
      accessibilityLabel={`${notification.isRead ? "Read" : "Unread"} notification: ${notification.title}`}
      style={[
        styles.item,
        !notification.isRead && styles.unreadItem,
      ]}
    >
      <View style={styles.itemHeading}>
        <Text style={styles.itemTitle}>{notification.title}</Text>
        {!notification.isRead && (
          <Text style={styles.unreadBadge}>NEW</Text>
        )}
      </View>
      {notification.message ? (
        <Text style={styles.body}>{notification.message}</Text>
      ) : null}
      <Text style={styles.meta}>
        {notification.type.replace(/[._:-]+/g, " ")} ·{" "}
        {readableTime(notification.createdAt)}
      </Text>
    </View>
  );
}

function ConversationCard({
  conversation,
  onPress,
}: {
  conversation: VendorConversation;
  onPress(): void;
}) {
  const title =
    conversation.counterpartName ||
    conversation.rfqNumber ||
    "RFQ conversation";

  return (
    <Pressable
      accessibilityHint="Opens this conversation inside the app"
      accessibilityLabel={`${title}, ${conversation.unreadCount} unread messages`}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.item,
        conversation.unreadCount > 0 && styles.unreadItem,
      ]}
    >
      <View style={styles.itemHeading}>
        <Text style={styles.itemTitle}>{title}</Text>
        {conversation.unreadCount > 0 && (
          <Text style={styles.countBadge}>
            {conversation.unreadCount}
          </Text>
        )}
      </View>

      <Text style={styles.meta}>
        {conversation.rfqNumber
          ? `RFQ ${conversation.rfqNumber}`
          : "Assigned RFQ"}
        {conversation.rfqStatus
          ? ` · ${conversation.rfqStatus.replace(/[._:-]+/g, " ")}`
          : ""}
        {conversation.isClosed ? " · Closed" : " · Active"}
      </Text>

      <Text
        numberOfLines={3}
        style={
          conversation.lastMessageBody
            ? styles.body
            : styles.muted
        }
      >
        {conversation.lastMessageBody ||
          "No conversation message is available yet."}
      </Text>

      <Text style={styles.meta}>
        {readableTime(conversation.lastMessageAt)}
      </Text>
    </Pressable>
  );
}

export function VendorWorkspaceScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack(): void;
}) {
  const [workspace, setWorkspace] =
    useState<VendorWorkspace | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<VendorConversation | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setMessage(null);

    try {
      setWorkspace(await loadVendorWorkspace(session));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your vendor workspace could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [session.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unreadNotifications = useMemo(
    () =>
      workspace?.notifications.filter(
        (notification) => !notification.isRead,
      ).length ?? 0,
    [workspace],
  );

  const unreadMessages = useMemo(
    () =>
      workspace?.conversations.reduce(
        (total, conversation) =>
          total + conversation.unreadCount,
        0,
      ) ?? 0,
    [workspace],
  );

  if (selectedConversation) {
    const selectedTitle =
      selectedConversation.counterpartName ||
      selectedConversation.rfqNumber ||
      "RFQ conversation";

    return (
      <VendorConversationScreen
        conversationId={selectedConversation.id}
        onBack={() => {
          setSelectedConversation(null);
          void refresh();
        }}
        session={session}
        summaryTitle={selectedTitle}
      />
    );
  }

  if (!workspace && busy) {
    return (
      <SafeAreaView
        accessibilityLabel="Loading vendor updates"
        accessibilityRole="progressbar"
        style={styles.center}
      >
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={styles.muted}>
          Loading your notifications and conversations…
        </Text>
      </SafeAreaView>
    );
  }

  if (!workspace) {
    return (
      <SafeAreaView style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {message || "Your vendor workspace could not be loaded."}
        </Text>
        <Button label="Try again" onPress={() => void refresh()} />
        <Button
          label="Back to dashboard"
          onPress={onBack}
          secondary
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={() => void refresh()}
            tintColor={colors.brand}
          />
        }
      >
        <Pressable
          accessibilityLabel="Back to dashboard"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
        >
          <Text style={styles.back}>‹ Back to dashboard</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>NATIVE VENDOR WORKSPACE</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Updates and conversations
          </Text>
          <Text style={styles.heroBody}>
            Review your authorised business alerts and RFQ conversation
            summaries without leaving the 3Bigha app.
          </Text>
        </View>

        <View style={styles.metrics}>
          <View
            accessibilityLabel={`Unread notifications: ${unreadNotifications}`}
            style={styles.metric}
          >
            <Text style={styles.metricValue}>
              {unreadNotifications}
            </Text>
            <Text style={styles.metricLabel}>
              Unread notifications
            </Text>
          </View>
          <View
            accessibilityLabel={`Unread conversation messages: ${unreadMessages}`}
            style={styles.metric}
          >
            <Text style={styles.metricValue}>{unreadMessages}</Text>
            <Text style={styles.metricLabel}>Unread messages</Text>
          </View>
        </View>

        {message && (
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
        )}

        <View style={styles.section}>
          <Text style={styles.kicker}>BUSINESS ALERTS</Text>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Notifications
          </Text>

          {workspace.notifications.length === 0 ? (
            <Text style={styles.empty}>
              No vendor notification is waiting for you.
            </Text>
          ) : (
            workspace.notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.kicker}>RFQ COMMUNICATION</Text>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Conversations
          </Text>
          <Text style={styles.muted}>
            Message summaries are read from your authenticated vendor
            conversation ledger. Full native message threads are the next
            protected workspace step.
          </Text>

          {workspace.conversations.length === 0 ? (
            <Text style={styles.empty}>
              No RFQ conversation is available yet.
            </Text>
          ) : (
            workspace.conversations.map((conversation) => (
              <ConversationCard
                conversation={conversation}
                key={conversation.id}
                onPress={() =>
                  setSelectedConversation(conversation)
                }
              />
            ))
          )}
        </View>

        <Text style={styles.footnote}>
          Pull down to refresh. No browser login is required.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Button({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress(): void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, secondary && styles.buttonSecondary]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
    gap: spacing.md,
    padding: spacing.lg,
  },
  page: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  back: {
    color: colors.brand,
    fontWeight: "800",
    paddingVertical: spacing.sm,
  },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accentSoft,
    fontSize: typography.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: colors.onBrand,
    fontSize: typography.display,
    lineHeight: 42,
    fontWeight: "900",
  },
  heroBody: {
    color: colors.onBrandMuted,
    fontSize: typography.body,
    lineHeight: 25,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metric: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: "44%",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  metricValue: {
    color: colors.brand,
    fontSize: 28,
    fontWeight: "900",
  },
  metricLabel: {
    color: colors.ink,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  kicker: {
    color: colors.brand,
    fontSize: typography.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900",
  },
  item: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  unreadItem: {
    borderColor: colors.brand,
    backgroundColor: colors.accentSoft,
  },
  itemHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  itemTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: "800",
  },
  unreadBadge: {
    color: colors.onBrand,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: typography.micro,
    fontWeight: "900",
  },
  countBadge: {
    minWidth: 28,
    color: colors.onBrand,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    textAlign: "center",
    fontSize: typography.caption,
    fontWeight: "900",
  },
  body: {
    color: colors.ink,
    fontSize: typography.caption,
    lineHeight: 21,
  },
  meta: {
    color: colors.muted,
    fontSize: typography.micro,
    lineHeight: 18,
    textTransform: "capitalize",
  },
  muted: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  empty: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 21,
    paddingVertical: spacing.md,
  },
  error: {
    color: "#A4382A",
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    minHeight: 52,
    minWidth: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonText: {
    color: colors.onBrand,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  buttonTextSecondary: {
    color: colors.ink,
  },
  footnote: {
    color: colors.muted,
    textAlign: "center",
    fontSize: typography.caption,
    padding: spacing.lg,
  },
});
