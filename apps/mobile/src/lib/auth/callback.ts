import * as Linking from "expo-linking";

const MAX_AUTHORIZATION_CODE_LENGTH = 2048;
let callbackConsumed = false;

export function nativeAuthCallbackUrl() {
  return Linking.createURL("auth/callback");
}

export function resetNativeAuthCallbackGate() {
  callbackConsumed = false;
}

export function consumeNativeAuthCallback(url: string): string {
  if (callbackConsumed) throw new Error("This sign-in link has already been handled.");

  let candidate: URL;
  let expected: URL;
  try {
    candidate = new URL(url);
    expected = new URL(nativeAuthCallbackUrl());
  } catch {
    throw new Error("That sign-in link is not valid.");
  }

  if (
    candidate.protocol !== expected.protocol ||
    candidate.host !== expected.host ||
    candidate.pathname !== expected.pathname ||
    candidate.username ||
    candidate.password ||
    candidate.hash
  ) {
    throw new Error("That sign-in link is not for this 3Bigha app.");
  }

  const keys = [...candidate.searchParams.keys()];
  const code = candidate.searchParams.get("code")?.trim() || "";
  if (keys.length !== 1 || keys[0] !== "code" || !code || code.length > MAX_AUTHORIZATION_CODE_LENGTH) {
    throw new Error("That sign-in link is incomplete or contains unexpected information.");
  }

  callbackConsumed = true;
  return code;
}
