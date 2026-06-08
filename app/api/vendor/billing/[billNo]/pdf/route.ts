import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = {
  params: {
    billNo: string;
  };
};

type BillRow = {
  id: string;
  vendor_user_id: string;
  bill_no: string;
  bill_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  subtotal: number | string | null;
  discount_amount: number | string | null;
  tax_amount: number | string | null;
  total_amount: number | string | null;
  payment_status: string | null;
  payment_mode: string | null;
  bill_items: any;
  note: string | null;
  created_at: string;
};

function asNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(v: unknown) {
  return `Rs. ${Math.round(asNumber(v)).toLocaleString("en-IN")}`;
}

function clean(v: unknown, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function titleCase(v: unknown) {
  return clean(v).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function safeDate(v: string) {
  try {
    return new Date(v).toLocaleString("en-IN");
  } catch {
    return v;
  }
}

function wrapText(text: string, maxChars: number) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : ["-"];
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const billNo = decodeURIComponent(ctx.params.billNo || "").trim();

  if (!billNo) {
    return NextResponse.json({ ok: false, error: "Bill number is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient(cookies());

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return NextResponse.json({ ok: false, error: sessionError.message }, { status: 401 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { data: bill, error } = await supabase
    .from("inventory_bills")
    .select("*")
    .eq("bill_no", billNo)
    .eq("vendor_user_id", session.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!bill) {
    return NextResponse.json({ ok: false, error: "Bill not found." }, { status: 404 });
  }

  const row = bill as BillRow;
  const items = Array.isArray(row.bill_items) ? row.bill_items : [];

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const blue = rgb(0.05, 0.22, 0.55);
  const dark = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.39, 0.45, 0.55);
  const light = rgb(0.94, 0.97, 1);
  const border = rgb(0.82, 0.86, 0.92);

  let y = height - 42;

  function text(
    value: string,
    x: number,
    yy: number,
    size = 10,
    opts?: { bold?: boolean; color?: any }
  ) {
    page.drawText(value, {
      x,
      y: yy,
      size,
      font: opts?.bold ? bold : font,
      color: opts?.color || dark,
    });
  }

  function line(x1: number, yy: number, x2: number) {
    page.drawLine({
      start: { x: x1, y: yy },
      end: { x: x2, y: yy },
      thickness: 1,
      color: border,
    });
  }

  page.drawRectangle({
    x: 32,
    y: height - 112,
    width: width - 64,
    height: 78,
    color: light,
    borderColor: border,
    borderWidth: 1,
  });

  const vendorBusinessName = clean((bill as any).vendor_business_name || "Vendor Business");
  const vendorAddress = clean((bill as any).vendor_business_address || "");
  const vendorPhone = clean((bill as any).vendor_phone || "");
  const vendorGstin = clean((bill as any).vendor_gstin || "");

  text(vendorBusinessName, 48, y, 22, { bold: true, color: blue });

  if (vendorAddress !== "-") {
    text(vendorAddress, 48, y - 18, 9, { color: muted });
  }

  const vendorMeta = [
    vendorPhone !== "-" ? `Phone: ${vendorPhone}` : "",
    vendorGstin !== "-" ? `GSTIN: ${vendorGstin}` : "",
  ]
    .filter(Boolean)
    .join("   •   ");

  if (vendorMeta) {
    text(vendorMeta, 48, y - 32, 9, { color: muted });
  }

  text(titleCase(row.bill_type), width - 205, y, 20, { bold: true, color: blue });
  text(`Bill No: ${row.bill_no}`, width - 205, y - 20, 10, { bold: true });
  text(`Date: ${safeDate(row.created_at)}`, width - 205, y - 36, 9, { color: muted });

  y -= 112;

  page.drawRectangle({
    x: 32,
    y: y - 74,
    width: width - 64,
    height: 86,
    borderColor: border,
    borderWidth: 1,
  });

  text("Customer Details", 48, y - 6, 12, { bold: true, color: blue });
  text(`Name: ${clean(row.customer_name)}`, 48, y - 26, 10);
  text(`Phone: ${clean(row.customer_phone)}`, 48, y - 42, 10);

  const addressLines = wrapText(clean(row.customer_address), 70).slice(0, 2);
  text(`Address: ${addressLines[0]}`, 48, y - 58, 10);
  if (addressLines[1]) text(addressLines[1], 90, y - 72, 10);

  text("Payment Details", width - 205, y - 6, 12, { bold: true, color: blue });
  text(`Status: ${titleCase(row.payment_status || "unpaid")}`, width - 205, y - 26, 10);
  text(`Mode: ${clean(row.payment_mode)}`, width - 205, y - 42, 10);

  y -= 118;

  page.drawRectangle({
    x: 32,
    y: y - 24,
    width: width - 64,
    height: 28,
    color: blue,
  });

  text("Type", 40, y - 15, 8, { bold: true, color: rgb(1, 1, 1) });
  text("Item", 95, y - 15, 9, { bold: true, color: rgb(1, 1, 1) });
  text("Qty", 295, y - 15, 8, { bold: true, color: rgb(1, 1, 1) });
  text("Unit", 332, y - 15, 8, { bold: true, color: rgb(1, 1, 1) });
  text("Rate", 382, y - 15, 8, { bold: true, color: rgb(1, 1, 1) });
  text("Disc", 432, y - 15, 8, { bold: true, color: rgb(1, 1, 1) });
  text("Tax", 472, y - 15, 8, { bold: true, color: rgb(1, 1, 1) });
  text("Total", 520, y - 15, 8, { bold: true, color: rgb(1, 1, 1) });

  y -= 38;

  const printableItems =
    items.length > 0
      ? items
      : [
          {
            item_type: "manual",
            item_name: "ERP Item",
            quantity: 0,
            unit: "",
            rate: 0,
            discount_amount: 0,
            tax_amount: 0,
            line_total: 0,
          },
        ];


  for (const item of printableItems.slice(0, 16)) {

    const itemName =
      item.item_name ||
      item.material_name ||
      item.item ||
      item.name ||
      "ERP Item";

    const itemLines = wrapText(clean(itemName), 28).slice(0, 2);

    const rowHeight = itemLines.length > 1 ? 38 : 26;

    page.drawRectangle({
      x: 32,
      y: y - rowHeight + 8,
      width: width - 64,
      height: rowHeight,
      borderColor: border,
      borderWidth: 0.6,
    });

    const typeLabel = titleCase(
      item.item_type || "manual"
    );

    page.drawRectangle({
      x: 40,
      y: y - 12,
      width: 44,
      height: 14,
      color: light,
      borderColor: border,
      borderWidth: 0.5,
    });

    text(typeLabel.slice(0, 8), 44, y - 8, 6, {
      bold: true,
      color: blue,
    });

    text(itemLines[0], 95, y, 9);

    if (itemLines[1]) {
      text(itemLines[1], 95, y - 13, 8, {
        color: muted,
      });
    }

    text(String(item.quantity ?? "-"), 295, y, 8);

    text(clean(item.unit), 332, y, 8);

    text(money(item.rate), 382, y, 8);

    text(
      money(item.discount_amount || 0),
      432,
      y,
      8
    );

    text(
      money(item.tax_amount || 0),
      472,
      y,
      8
    );

    text(
      money(item.line_total || item.amount || 0),
      520,
      y,
      8,
      { bold: true }
    );

    y -= rowHeight;
  }

  y -= 20;

  const summaryX = width - 230;

  line(summaryX, y + 8, width - 32);
  text("Subtotal", summaryX, y - 10, 10);
  text(money(row.subtotal), width - 105, y - 10, 10, { bold: true });

  text("Discount", summaryX, y - 30, 10);
  text(money(row.discount_amount), width - 105, y - 30, 10, { bold: true });

  text("Tax", summaryX, y - 50, 10);
  text(money(row.tax_amount), width - 105, y - 50, 10, { bold: true });

  page.drawRectangle({
    x: summaryX - 8,
    y: y - 86,
    width: 206,
    height: 28,
    color: light,
    borderColor: border,
    borderWidth: 1,
  });

  text("Total", summaryX, y - 77, 12, { bold: true, color: blue });
  text(money(row.total_amount), width - 112, y - 77, 12, { bold: true, color: blue });

  const vendorTerms = clean((bill as any).vendor_terms || "", "");

  if (vendorTerms) {
    const termLines = wrapText(vendorTerms, 90).slice(0, 4);

    text("Terms & Conditions", 40, y - 18, 10, {
      bold: true,
      color: blue,
    });

    termLines.forEach((line, idx) => {
      text(line, 40, y - 36 - idx * 14, 8, {
        color: muted,
      });
    });

    y -= 78;
  }

  if (row.note) {
    const noteLines = wrapText(row.note, 90).slice(0, 3);
    text("Note", 40, y - 18, 10, { bold: true, color: blue });
    noteLines.forEach((n, idx) => text(n, 40, y - 36 - idx * 14, 9, { color: muted }));
  }

  y -= 126;

  line(32, 92, width - 32);
  text("This is a computer-generated invoice.", 40, 72, 8, {
    color: muted,
  });

  text("Powered by 3Bigha ERP OS • https://3bigha.com", 40, 58, 8, {
    color: muted,
  });

  text("Authorised Signatory", width - 168, 72, 9, { bold: true });
  line(width - 170, 92, width - 46);

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${row.bill_no}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}