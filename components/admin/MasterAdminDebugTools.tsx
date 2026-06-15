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
    return html2canvas(document.documentElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
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

      const fullCanvas = await html2canvas(document.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;

      const pageCanvas = document.createElement("canvas");
      const pageCtx = pageCanvas.getContext("2d");

      if (!pageCtx) {
        throw new Error("Could not prepare PDF canvas.");
      }

      const pagePixelHeight = Math.floor(
        (fullCanvas.width * pageHeight) / pageWidth
      );

      let renderedHeight = 0;
      let firstPage = true;

      while (renderedHeight < fullCanvas.height) {
        pageCanvas.width = fullCanvas.width;
        pageCanvas.height = Math.min(
          pagePixelHeight,
          fullCanvas.height - renderedHeight
        );

        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);

        pageCtx.drawImage(
          fullCanvas,
          0,
          renderedHeight,
          fullCanvas.width,
          pageCanvas.height,
          0,
          0,
          fullCanvas.width,
          pageCanvas.height
        );

        const imgData = pageCanvas.toDataURL("image/png");
        const imgHeight = (pageCanvas.height * imgWidth) / pageCanvas.width;

        if (!firstPage) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

        renderedHeight += pageCanvas.height;
        firstPage = false;
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
