import { getFirebaseMessaging } from "./firebaseAdmin";
import { MobilePushPayload } from "./pushTypes";

type SendMobilePushInput = {
  tokens: string[];
  payload: MobilePushPayload;
};

export async function sendMobilePush({
  tokens,
  payload,
}: SendMobilePushInput) {
  try {
    if (!tokens.length) {
      return;
    }

    const messaging = getFirebaseMessaging();

    const cleanTokens = Array.from(new Set(tokens.filter(Boolean)));

    if (!cleanTokens.length) {
      return;
    }

    const data: Record<string, string> = {
      category: payload.category,
      url: payload.url || "",
      conversationId: payload.conversationId || "",
      rfqId: payload.rfqId || "",
      silent: payload.silent ? "true" : "false",
      ...(payload.data
        ? Object.fromEntries(
            Object.entries(payload.data).map(([key, value]) => [
              key,
              value === null || value === undefined ? "" : String(value),
            ])
          )
        : {}),
    };

    const response = await messaging.sendEachForMulticast({
      tokens: cleanTokens,
      notification: payload.silent
        ? undefined
        : {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.image,
          },
      data,
      android: {
        priority: payload.silent ? "normal" : "high",
        notification: payload.silent
          ? undefined
          : {
              channelId: payload.category,
              clickAction: "OPEN_3BIGHA",
            },
      },
    });

    if (response.failureCount > 0) {
      console.error("Some mobile pushes failed", {
        failureCount: response.failureCount,
        successCount: response.successCount,
        errors: response.responses
          .map((r, i) =>
            r.success
              ? null
              : {
                  token: cleanTokens[i],
                  error: r.error?.message,
                  code: r.error?.code,
                }
          )
          .filter(Boolean),
      });
    }
  } catch (err) {
    console.error("Mobile push dispatch failed", err);
  }
}