import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");

const screen = read("apps/mobile/src/features/property/PropertyLegalReviewScreen.tsx");
const accessRoute = read("app/api/v1/mobile/property-legal-review/[requestId]/documents/[documentId]/access/route.ts");
const files = read("apps/mobile/src/lib/files/protected-attachment.ts");
const viewer = read("apps/mobile/src/lib/files/ProtectedAttachmentViewer.tsx");
const hook = read("apps/mobile/src/lib/files/useProtectedAttachmentViewer.ts");
const android = read("apps/mobile/modules/protected-pdf-preview/android/src/main/java/expo/modules/protectedpdfpreview/ProtectedPdfPreviewModule.kt");
const apple = read("apps/mobile/modules/protected-pdf-preview/ios/ProtectedPdfPreviewModule.swift");
const moduleConfig = read("apps/mobile/modules/protected-pdf-preview/expo-module.config.json");
const root = read("apps/mobile/app/_layout.tsx");

assert.match(accessRoute, /authenticateMobileRequest\(request\)/);
assert.match(accessRoute, /createMobilePropertyLegalDocumentAccess/);
assert.match(accessRoute, /private, no-store/);
assert.match(screen, /createPropertyLegalDocumentAccess/);
assert.match(screen, /attachmentViewer\.open\(/);
assert.match(screen, /<ProtectedAttachmentViewer/);
assert.doesNotMatch(screen, /WebBrowser|openBrowserAsync|Linking\.openURL/);
assert.match(files, /parsed\.protocol !== "https:"/);
assert.match(files, /MAX_ATTACHMENT_BYTES/);
assert.match(files, /deleteAsync/);
assert.match(hook, /deleteProtectedAttachment\(uri\)/);
assert.match(viewer, /requireOptionalNativeModule<PdfPreviewModule>\("ProtectedPdfPreview"\)/);
assert.match(viewer, /Image source=\{\{ uri: attachment\.uri \}\}/);
assert.match(viewer, /Page \{pageIndex \+ 1\} of \{pageCount\}/);
assert.match(android, /PdfRenderer/);
assert.match(android, /Only protected PDF attachments can be previewed/);
assert.match(apple, /PDFDocument/);
assert.match(apple, /Only protected PDF attachments can be previewed/);
assert.match(moduleConfig, /ProtectedPdfPreviewModule/);
assert.match(root, /cleanupProtectedAttachmentCache\(\)/);

console.log("Protected legal-document authorization, in-app image/PDF viewer and temporary-file cleanup checks passed.");
