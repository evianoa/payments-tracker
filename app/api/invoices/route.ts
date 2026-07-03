import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function resolvePdfUrl(pdfPath: string | null): string | null {
  if (!pdfPath) return null;

  const storageRoot =
    (process.env.PAYMENTS_STORAGE_ROOT || "/home/eviano/payments-tracker-storage").replace(
      /\/$/,
      ""
    );
  const storageUrl = (process.env.PAYMENTS_STORAGE_URL || "https://fc.piano-maestro.com/payments-storage").replace(
    /\/$/,
    ""
  );

  if (pdfPath.startsWith(storageRoot)) {
    const relative = pdfPath.slice(storageRoot.length);
    return `${storageUrl}${relative}`;
  }

  if (pdfPath.startsWith("/") || pdfPath.startsWith("http")) {
    return pdfPath;
  }

  return `${storageUrl}/${pdfPath}`;
}

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  const enriched = invoices.map((inv) => ({
    ...inv,
    pdfUrl: resolvePdfUrl(inv.pdfPath),
    amount: inv.amount.toString(),
  }));

  return NextResponse.json(enriched);
}
