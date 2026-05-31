import { getUserPushTokens } from "./getUserPushTokens";
import { sendMobilePush } from "./sendMobilePush";
import { MobilePushPayload } from "./pushTypes";

export async function notifyUser(
  userId: string,
  payload: MobilePushPayload
) {
  try {
    const tokens = await getUserPushTokens(userId);

    if (!tokens.length) {
      return;
    }

    await sendMobilePush({
      tokens,
      payload,
    });
  } catch (err) {
    console.error("notifyUser failed", err);
  }
}