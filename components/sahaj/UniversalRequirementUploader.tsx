"use client";

import { useState } from "react";

type UploadMode = "photo" | "document" | "voice" | "video" | "any";

export default function UniversalRequirementUploader({
  mode = "any",
  onFilesSelected,
}: {
  mode?: UploadMode;
  onFilesSelected?: (files: File[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);

  const accept =
    mode === "photo"
      ? "image/*"
      : mode === "voice"
      ? "audio/*"
      : mode === "video"
      ? "video/*"
      : mode === "document"
      ? "application/pdf,.xls,.xlsx,.csv,.doc,.docx,.dwg,.dxf,image/*"
      : "image/*,audio/*,video/*,application/pdf,.xls,.xlsx,.csv,.doc,.docx,.dwg,.dxf";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    onFilesSelected?.(selected);
  }

  return (
    <section className="rounded-3xl border bg-white p-4">
      <h2 className="text-lg font-black text-slate-950">
        Upload requirement
      </h2>

      <p className="mt-1 text-sm font-bold text-slate-600">
        Handwritten note, photo, PDF, BOQ, Excel, drawing, voice or video.
      </p>

      <input
        type="file"
        multiple
        accept={accept}
        onChange={handleChange}
        className="mt-4 w-full rounded-2xl border p-4 font-bold"
      />

      {files.length ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
          <p className="font-black text-emerald-800">
            {files.length} file{files.length > 1 ? "s" : ""} selected
          </p>
          <ul className="mt-2 grid gap-1 text-sm font-bold text-slate-600">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>
                {file.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
