import * as FileSystem from "expo-file-system/legacy";

export type ProtectedAttachment = {
  uri: string;
  fileName: string;
  mimeType: string | null;
};

const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024;

function safeExtension(fileName: string, mimeType: string | null) {
  const dot = fileName.lastIndexOf(".");
  const extension = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  if (extension && extension.length <= 8) return extension;
  if (mimeType?.toLowerCase() === "application/pdf") return "pdf";
  if (mimeType?.toLowerCase() === "image/png") return "png";
  if (mimeType?.toLowerCase() === "image/webp") return "webp";
  if (mimeType?.toLowerCase() === "image/jpeg") return "jpg";
  return "file";
}

function uniqueName(extension: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `3bigha-protected-${id}.${extension}`;
}

export async function downloadProtectedAttachment(
  accessUrl: string,
  fileName: string,
  mimeType: string | null = null,
): Promise<ProtectedAttachment> {
  const parsed = new URL(accessUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("This protected file did not have a secure download address.");
  }
  if (!FileSystem.cacheDirectory) {
    throw new Error("Secure temporary file storage is unavailable on this device.");
  }

  const localUri = `${FileSystem.cacheDirectory}${uniqueName(safeExtension(fileName, mimeType))}`;
  const download = await FileSystem.downloadAsync(accessUrl, localUri, {
    headers: { Accept: "application/octet-stream, application/pdf, image/*" },
  });
  if (download.status < 200 || download.status >= 300) {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => undefined);
    throw new Error("The protected file could not be downloaded. Request access again and retry.");
  }

  const info = await FileSystem.getInfoAsync(localUri);
  if (!info.exists || (typeof info.size === "number" && (info.size <= 0 || info.size > MAX_ATTACHMENT_BYTES))) {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => undefined);
    throw new Error("This file is empty or larger than the 30 MB mobile viewing limit.");
  }
  return { uri: localUri, fileName, mimeType };
}

export async function deleteProtectedAttachment(uri: string | null | undefined) {
  if (!uri || !uri.startsWith("file://")) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

/** Clears only files created by this viewer, including leftovers after an app crash. */
export async function cleanupProtectedAttachmentCache() {
  if (!FileSystem.cacheDirectory) return;
  const names = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory).catch(() => [] as string[]);
  await Promise.all(names
    .filter((name) => name.startsWith("3bigha-protected-") || name.startsWith("3bigha-pdf-page-"))
    .map((name) => FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${name}`, { idempotent: true }).catch(() => undefined)));
}
