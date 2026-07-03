import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeTrafficLight } from "@/lib/traffic-light";
import { composeFollowUpEmail } from "@/lib/email-composer";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const { daysOverdue } = computeTrafficLight(invoice.status, invoice.dueDate ?? null);
  const invoiceNumber = invoice.id.slice(-8).toUpperCase();

  const result = composeFollowUpEmail({
    invoiceId: invoice.id,
    invoiceNumber,
    amount: invoice.amount.toString(),
    currency: invoice.currency,
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    daysOverdue,
  });

  return NextResponse.json(result);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;
  const body = await req.json().catch(() => ({}));
  const toneOverride = body.tone as "gentle" | "action-oriented" | "firm" | undefined;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const { daysOverdue } = computeTrafficLight(invoice.status, invoice.dueDate ?? null);
  const invoiceNumber = invoice.id.slice(-8).toUpperCase();

  const result = composeFollowUpEmail(
    {
      invoiceId: invoice.id,
      invoiceNumber,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      clientName: invoice.client.name,
      clientEmail: invoice.client.email,
      daysOverdue,
    },
    toneOverride
  );

  return NextResponse.json(result);
}
