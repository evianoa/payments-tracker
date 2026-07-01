export interface ComposerInput {
  invoiceId: string;
  invoiceNumber: string;
  amount: string | number;
  currency: string;
  clientName: string;
  clientEmail: string | null;
  daysOverdue: number;
}

type EmailTone = "gentle" | "action-oriented" | "firm";

function formatAmount(amount: string | number, currency: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}

function daysText(n: number): string {
  if (n === 1) return "1 day";
  return `${n} days`;
}

/**
 * Compose a follow-up email for an overdue invoice.
 * Returns subject, body, and a Gmail compose URL — opens in new tab.
 * No server-side send; user reviews and sends manually.
 */
export function composeFollowUpEmail(
  invoice: ComposerInput,
  toneOverride?: EmailTone
): { subject: string; body: string; gmailUrl: string } {
  const { invoiceNumber, amount, currency, clientName, clientEmail, daysOverdue } = invoice;

  const displayAmount = formatAmount(amount, currency);
  const tone: EmailTone = toneOverride ??
    (daysOverdue >= 21 ? "firm" : daysOverdue >= 8 ? "action-oriented" : "gentle");

  let subject: string;
  let body: string;
  const greeting = clientName ? `Hi ${clientName},` : "Hi,";

  if (tone === "gentle") {
    subject = `Reminder: Invoice ${invoiceNumber} is due`;
    body = `${greeting}

I hope this message finds you well. I wanted to follow up regarding Invoice ${invoiceNumber} for ${displayAmount}.

Please let me know if you have any questions or if there's anything I can help with to expedite the payment process.

Thank you for your attention to this matter.

Best regards`;
  } else if (tone === "action-oriented") {
    subject = `Action required: Invoice ${invoiceNumber} (${daysText(daysOverdue)} overdue)`;
    body = `${greeting}

I hope you're well. I'm following up on Invoice ${invoiceNumber} for ${displayAmount}, which is now ${daysText(daysOverdue)} overdue.

Could you please review and arrange payment at your earliest convenience? If there are any issues with the invoice or the payment, please let me know so we can resolve them promptly.

Thank you for your prompt attention.

Best regards`;
  } else {
    subject = `URGENT: Invoice ${invoiceNumber} is ${daysText(daysOverdue)} overdue — immediate payment required`;
    body = `${greeting}

I am writing to formally notify you that Invoice ${invoiceNumber} for ${displayAmount} is now ${daysText(daysOverdue)} overdue. Despite previous reminders, we have not received payment or any communication regarding this matter.

Please arrange immediate payment or contact us within 48 hours with a concrete payment plan. Failure to respond may result in further action.

If you believe this notice has been sent in error, please provide proof of payment immediately.

Yours sincerely`;
  }

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const to = clientEmail ? encodeURIComponent(clientEmail) : "";
  const gmailUrl = clientEmail
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${encodedSubject}&body=${encodedBody}`
    : `https://mail.google.com/mail/?view=cm&fs=1&su=${encodedSubject}&body=${encodedBody}`;

  return { subject, body, gmailUrl };
}
