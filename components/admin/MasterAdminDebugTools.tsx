"use client";

import { useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function MasterAdminDebugTools({
  email,
}: {
  email?: string | null;
}) {
  const [busy, setBusy] = useState(false);

  if (String(email ?? "").trim().toLowerCase() !== "vivek.abek@gmail.com") {
    return null;
  }

  async function captureCanvas() {
    return html2canvas(document.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });
  }

  async function exportPng() {
    try {
      setBusy(true);
      const canvas = await captureCanvas();
      const link = document.createElement("a");
      link.download = "3bigha-page-capture.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf() {
    try {
      setBusy(true);

      const canvas = await captureCanvas();
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = 297;

      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save("3bigha-page-capture.pdf");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="masterAdminDebugTools" data-no-translate="true">
      <button type="button" onClick={exportPng} disabled={busy}>
        📸 PNG
      </button>

      <button type="button" onClick={exportPdf} disabled={busy}>
        📄 PDF
      </button>
    </div>
  );
}
