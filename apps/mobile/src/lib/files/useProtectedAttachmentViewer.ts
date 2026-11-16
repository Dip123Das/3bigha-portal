import { useCallback, useEffect, useRef, useState } from "react";

import { deleteProtectedAttachment, downloadProtectedAttachment, type ProtectedAttachment } from "./protected-attachment";

export function useProtectedAttachmentViewer() {
  const [attachment, setAttachment] = useState<ProtectedAttachment | null>(null);
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const currentUri = useRef<string | null>(null);

  const open = useCallback(async (accessUrl: string, fileName: string, mimeType: string | null = null) => {
    const currentGeneration = ++generation.current;
    setLoading(true);
    try {
      const downloaded = await downloadProtectedAttachment(accessUrl, fileName, mimeType);
      if (currentGeneration !== generation.current) {
        await deleteProtectedAttachment(downloaded.uri);
        return;
      }
      await deleteProtectedAttachment(currentUri.current);
      currentUri.current = downloaded.uri;
      setAttachment(downloaded);
    } finally {
      if (currentGeneration === generation.current) setLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    generation.current += 1;
    const uri = currentUri.current;
    currentUri.current = null;
    setAttachment(null);
    setLoading(false);
    void deleteProtectedAttachment(uri);
  }, []);

  useEffect(() => () => {
    generation.current += 1;
    const uri = currentUri.current;
    currentUri.current = null;
    void deleteProtectedAttachment(uri);
  }, []);

  return { attachment, loading, open, close };
}
