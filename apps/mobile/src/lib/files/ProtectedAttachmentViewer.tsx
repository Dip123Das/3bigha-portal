import { requireOptionalNativeModule } from "expo-modules-core";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, PixelRatio, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme/tokens";
import { deleteProtectedAttachment, type ProtectedAttachment } from "./protected-attachment";

type PdfPreviewModule = {
  getPageCount(uri: string): Promise<number>;
  renderPage(uri: string, pageIndex: number, width: number, outputDirectory: string): Promise<string>;
};

const pdfPreview = requireOptionalNativeModule<PdfPreviewModule>("ProtectedPdfPreview");

function kindOf(file: ProtectedAttachment) {
  const mime = file.mimeType?.toLowerCase() || "";
  const name = file.fileName.toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif)$/.test(name)) return "image";
  return "unsupported";
}

export function ProtectedAttachmentViewer({
  attachment,
  onClose,
}: {
  attachment: ProtectedAttachment | null;
  onClose(): void;
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pageUri, setPageUri] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kind = attachment ? kindOf(attachment) : "unsupported";

  useEffect(() => {
    setPageIndex(0);
    setPageCount(0);
    setPageUri(null);
    setPageSize(null);
    setError(null);
  }, [attachment?.uri]);

  useEffect(() => {
    if (!attachment || kind !== "pdf") return;
    if (!pdfPreview) {
      setError("The native PDF viewer is unavailable in this app build. Update the app to preview PDFs here.");
      return;
    }
    let active = true;
    let generatedUri: string | null = null;
    setBusy(true);
    setError(null);
    setPageUri(null);
    setPageSize(null);

    const outputDirectory = attachment.uri.slice(0, attachment.uri.lastIndexOf("/") + 1);
    void pdfPreview.getPageCount(attachment.uri).then((count) => {
      if (!active) return;
      if (!Number.isInteger(count) || count < 1 || count > 250) throw new Error("This PDF has an unsupported page count.");
      setPageCount(count);
      if (pageIndex >= count) setPageIndex(0);
      return pdfPreview.renderPage(attachment.uri, Math.min(pageIndex, count - 1), Math.round((screenWidth - 32) * PixelRatio.get()), outputDirectory);
    }).then((uri) => {
      if (!uri) return;
      generatedUri = uri;
      if (active) setPageUri(uri);
      else void deleteProtectedAttachment(uri);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "This PDF page could not be displayed.");
    }).finally(() => {
      if (active) setBusy(false);
    });

    return () => {
      active = false;
      if (generatedUri) void deleteProtectedAttachment(generatedUri);
    };
  }, [attachment?.uri, kind, pageIndex, screenWidth]);

  const imageWidth = Math.max(180, screenWidth - 32);
  const imageHeight = pageSize
    ? Math.min(screenHeight * 0.7, imageWidth * pageSize.height / pageSize.width)
    : screenHeight * 0.68;

  return (
    <Modal visible={attachment !== null} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text numberOfLines={1} accessibilityRole="header" style={styles.title}>{attachment?.fileName || "Attachment"}</Text>
            <Text style={styles.subTitle}>{kind === "pdf" ? "PDF · private in-app preview" : kind === "image" ? "Image · private in-app preview" : "Protected attachment"}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close attachment viewer" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
        <View style={styles.body}>
          {kind === "image" && attachment ? (
            <ScrollView contentContainerStyle={styles.imageScroll} maximumZoomScale={4} minimumZoomScale={1} centerContent>
              <Image source={{ uri: attachment.uri }} resizeMode="contain" style={{ width: imageWidth, height: screenHeight * 0.72 }} />
            </ScrollView>
          ) : null}
          {kind === "pdf" ? (
            <>
              {busy ? <View style={styles.center}><ActivityIndicator color={colors.brand} size="large" /><Text style={styles.muted}>Rendering this page on your device…</Text></View> : null}
              {pageUri ? <ScrollView contentContainerStyle={styles.pdfScroll} maximumZoomScale={3} minimumZoomScale={1} centerContent>
                <Image source={{ uri: pageUri }} resizeMode="contain" style={{ width: imageWidth, height: imageHeight }} onLoad={(event) => setPageSize(event.nativeEvent.source)} />
              </ScrollView> : null}
              {!busy && !pageUri && !error ? <View style={styles.center}><Text style={styles.muted}>Preparing the protected PDF…</Text></View> : null}
            </>
          ) : null}
          {kind === "unsupported" ? <View style={styles.center}><Text style={styles.error}>This file type cannot be previewed inside 3Bigha yet.</Text></View> : null}
          {error ? <View style={styles.errorCard}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View> : null}
        </View>
        {kind === "pdf" && pageCount > 0 ? <View style={styles.footer}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous PDF page" disabled={pageIndex <= 0 || busy} onPress={() => setPageIndex((value) => Math.max(0, value - 1))} style={[styles.pageButton, (pageIndex <= 0 || busy) && styles.disabled]}><Text style={styles.pageButtonText}>Previous</Text></Pressable>
          <Text accessibilityLiveRegion="polite" style={styles.pageNumber}>Page {pageIndex + 1} of {pageCount}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next PDF page" disabled={pageIndex >= pageCount - 1 || busy} onPress={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))} style={[styles.pageButton, (pageIndex >= pageCount - 1 || busy) && styles.disabled]}><Text style={styles.pageButtonText}>Next</Text></Pressable>
        </View> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#111315" },
  header: { minHeight: 62, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: 1, borderBottomColor: "#33383D" },
  titleWrap: { flex: 1, gap: 2 },
  title: { color: "#FFFFFF", fontSize: typography.body, fontWeight: "700" },
  subTitle: { color: "#B8C0C8", fontSize: 12 },
  closeButton: { borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: "#2B3035" },
  closeText: { color: "#FFFFFF", fontWeight: "700" },
  body: { flex: 1, justifyContent: "center", alignItems: "center" },
  imageScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  pdfScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: spacing.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  muted: { color: "#CDD2D8", textAlign: "center" },
  errorCard: { position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, padding: spacing.md, backgroundColor: "#2B2020", borderRadius: radii.md },
  error: { color: "#FFC4C4", textAlign: "center" },
  footer: { minHeight: 64, paddingHorizontal: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#33383D" },
  pageButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.brand },
  pageButtonText: { color: "#FFFFFF", fontWeight: "700" },
  pageNumber: { color: "#FFFFFF", fontWeight: "600" },
  disabled: { opacity: 0.4 },
});
