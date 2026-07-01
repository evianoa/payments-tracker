import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid" },
  });

  return NextResponse.json(invoice);
}
