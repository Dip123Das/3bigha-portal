"use client";

import { useEffect, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const MASTER_ADMIN_EMAIL = "vivek.abek@gmail.com";

export default function MasterAdminDebugTools() {
  const [busy, setBusy] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;
    const supabase = getSupabaseBrowser();

    async function checkUser() {
      try {
        const { data } = await supabase.auth.getUser();
        const email = String(data.user?.email ?? "").trim().toLowerCase();

        if (alive) {
          setAllowed(email === MASTER_ADMIN_EMAIL);
        }
      } catch {
        if (alive) {
          setAllowed(false);
        }
      }
    }

    checkUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = String(session?.user?.email ?? "").trim().toLowerCase();
      setAllowed(email === MASTER_ADMIN_EMAIL);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!allowed) {
    return null;
  }

  async function captureCanvas() {
    const exportWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
      window.innerWidth,
      1280
    );

    const exportHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      window.innerHeight
    );

    return html2canvas(document.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: exportWidth,
      height: exportHeight,
      windowWidth: exportWidth,
      windowHeight: exportHeight,
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

      const isTallCapture = canvas.height > canvas.width * 1.35;
      const pdf = new jsPDF(isTallCapture ? "p" : "l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
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
