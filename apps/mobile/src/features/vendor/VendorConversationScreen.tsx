import type { Session } from "@supabase/supabase-js";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  loadVendorConversation,
  markVendorConversationSeen,
  sendVendorConversationMessage,
  type VendorConversationMessage,
  type VendorConversationThread,
} from "@/features/vendor/api";
import { colors, radii, spacing, typography } from "@/theme/tokens";

function readableTime(value: string | null) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString();
}

function MessageBubble({
  message,
}: {
  message: VendorConversationMessage;
}) {
  const isSystem =
    message.senderRole.toLowerCase() === "system" ||
    message.messageType.toLowerCase() === "system";

  return (
    <View
      accessibilityLabel={`${message.isMine ? "Your" : isSystem ? "System" : "Buyer"} message: ${message.body}`}
      style={[
        styles.messageRow,
        message.isMine && styles.myMessageRow,
      ]}
    >
      <View
        style={[
          styles.bubble,
          message.isMine && styles.myBubble,
          isSystem && styles.systemBubble,
        ]}
      >
        <Text
          style={[
            styles.sender,
            message.isMine && styles.myText,
          ]}
        >
          {message.isMine
            ? "You"
            : isSystem
              ? "3Bigha"
              : "Buyer"}
        </Text>
        <Text
          selectable
          style={[
            styles.messageBody,
            message.isMine && styles.myText,
          ]}
        >
          {message.body || "Unsupported message content"}
        </Text>
        <Text
          style={[
            styles.messageTime,
            message.isMine && styles.myTime,
          ]}
        >
          {readableTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export function VendorConversationScreen({
  session,
  conversationId,
  summaryTitle,
  onBack,
}: {
  session: Session;
  conversationId: string;
  summaryTitle: string;
  onBack(): void;
}) {
  const [thread, setThread] =
    useState<VendorConversationThread | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const markLatestSeen = useCallback(
    async (value: VendorConversationThread) => {
      const latest =
        value.messages.length > 0
          ? value.messages[value.messages.length - 1]
          : null;

      try {
        await markVendorConversationSeen(
          session,
          value.id,
          latest?.id || null,
        );
      } catch {
        // Read-state failure must not hide an otherwise valid thread.
      }
    },
    [session.access_token],
  );

  const refresh = useCallback(async () => {
    setBusy(true);
    setMessage(null);

    try {
      const value = await loadVendorConversation(
        session,
        conversationId,
      );
      setThread(value);
      await markLatestSeen(value);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your conversation could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    conversationId,
    markLatestSeen,
    session.access_token,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function send() {
    const body = draft.trim();

    if (!body || sending || thread?.isClosed) return;

    setSending(true);
    setMessage(null);

    try {
      const sent = await sendVendorConversationMessage(
        session,
        conversationId,
        body,
      );

      setThread((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, sent],
            }
          : current,
      );
      setDraft("");

      try {
        await markVendorConversationSeen(
          session,
          conversationId,
          sent.id,
        );
      } catch {
        // Sending succeeded; a read-state retry can happen on refresh.
      }

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }

  if (!thread && busy) {
    return (
      <SafeAreaView
        accessibilityLabel="Loading conversation"
        accessibilityRole="progressbar"
        style={styles.center}
      >
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={styles.muted}>
          Loading your protected conversation…
        </Text>
      </SafeAreaView>
    );
  }

  if (!thread) {
    return (
      <SafeAreaView style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {message || "Your conversation could not be loaded."}
        </Text>
        <Button label="Try again" onPress={() => void refresh()} />
        <Button
          label="Back to conversations"
          onPress={onBack}
          secondary
        />
      </SafeAreaView>
    );
  }

  const title =
    thread.counterpartName ||
    thread.rfqNumber ||
    summaryTitle ||
    "RFQ conversation";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.safe}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to vendor conversations"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
          >
            <Text style={styles.back}>‹ Conversations</Text>
          </Pressable>

          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.meta}>
            {thread.rfqNumber
              ? `RFQ ${thread.rfqNumber}`
              : "Assigned RFQ"}
            {thread.isClosed ? " · Closed" : " · Active"}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
          ref={scrollRef}
          refreshControl={
            <RefreshControl
              refreshing={busy}
              onRefresh={() => void refresh()}
              tintColor={colors.brand}
            />
          }
        >
          {thread.messages.length === 0 ? (
            <Text style={styles.empty}>
              No message has been sent in this conversation yet.
            </Text>
          ) : (
            thread.messages.map((item) => (
              <MessageBubble key={item.id} message={item} />
            ))
          )}
        </ScrollView>

        {message && (
          <Text accessibilityRole="alert" style={styles.errorBar}>
            {message}
          </Text>
        )}

        {thread.isClosed ? (
          <View style={styles.closed}>
            <Text style={styles.closedTitle}>
              This conversation is closed
            </Text>
            <Text style={styles.muted}>
              Its history remains available, but new messages cannot
              be sent.
            </Text>
          </View>
        ) : (
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Write vendor reply"
              editable={!sending}
              maxLength={4000}
              multiline
              onChangeText={setDraft}
              placeholder="Write a reply…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={draft}
            />
            <Pressable
              accessibilityLabel="Send message"
              accessibilityRole="button"
              disabled={!draft.trim() || sending}
              onPress={() => void send()}
              style={[
                styles.send,
                (!draft.trim() || sending) && styles.sendDisabled,
              ]}
            >
              {sending ? (
                <ActivityIndicator
                  color={colors.onBrand}
                  size="small"
                />
              ) : (
                <Text style={styles.sendText}>Send</Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
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
  header: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  back: {
    color: colors.brand,
    fontWeight: "800",
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900",
  },
  meta: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  messages: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  messageRow: {
    alignItems: "flex-start",
  },
  myMessageRow: {
    alignItems: "flex-end",
  },
  bubble: {
    maxWidth: "86%",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  myBubble: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  systemBubble: {
    alignSelf: "center",
    backgroundColor: colors.accentSoft,
  },
  sender: {
    color: colors.brand,
    fontSize: typography.micro,
    fontWeight: "900",
  },
  messageBody: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 23,
  },
  myText: {
    color: colors.onBrand,
  },
  messageTime: {
    color: colors.muted,
    fontSize: typography.micro,
  },
  myTime: {
    color: colors.onBrandMuted,
  },
  empty: {
    color: colors.muted,
    textAlign: "center",
    paddingVertical: spacing.xl,
    lineHeight: 21,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 130,
    color: colors.ink,
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
  },
  send: {
    minWidth: 72,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendText: {
    color: colors.onBrand,
    fontWeight: "900",
  },
  closed: {
    backgroundColor: colors.accentSoft,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  closedTitle: {
    color: colors.ink,
    fontWeight: "900",
  },
  muted: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  error: {
    color: "#A4382A",
    textAlign: "center",
    lineHeight: 22,
  },
  errorBar: {
    color: "#A4382A",
    backgroundColor: colors.surface,
    textAlign: "center",
    padding: spacing.sm,
  },
  button: {
    minHeight: 52,
    minWidth: 180,
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "800",
  },
  buttonTextSecondary: {
    color: colors.ink,
  },
});
