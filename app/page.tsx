"use client";

import { useEffect, useState, useCallback } from "react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  vaultLink: string | null;
}

interface Invoice {
  id: string;
  clientId: string;
  amount: string;
  currency: string;
  dueDate: string | null;
  status: string;
  pdfPath: string | null;
  notes: string | null;
  createdAt: string;
  client: Client;
}

interface EmailDraft {
  subject: string;
  body: string;
  gmailUrl: string;
}

function TrafficDot({ light }: { light: "green" | "amber" | "red" }) {
  const colors = { green: "bg-green-500", amber: "bg-yellow-500", red: "bg-red-500" };
  return <span className={`inline-block w-3 h-3 rounded-full ${colors[light]}`} title={light} />;
}

function useTrafficLight(dueDate: string | null, status: string) {
  const [light, setLight] = useState<"green" | "amber" | "red">("green");
  const [daysOverdue, setDaysOverdue] = useState(0);

  useEffect(() => {
    if (!dueDate) { setLight("green"); setDaysOverdue(0); return; }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);

    if (status === "paid") { setLight("green"); setDaysOverdue(0); }
    else if (diff >= 8) { setLight("red"); setDaysOverdue(diff); }
    else if (diff >= 1 || (diff <= 0 && diff >= -7)) { setLight("amber"); setDaysOverdue(Math.max(0, diff)); }
    else { setLight("green"); setDaysOverdue(0); }
  }, [dueDate, status]);

  return { light, daysOverdue };
}

function DraftButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/compose-email`);
      if (!res.ok) throw new Error();
      const data: EmailDraft = await res.json();
      window.open(data.gmailUrl, "_blank", "noopener,noreferrer");
    } catch {
      alert("Could not compose email. Is the dev server running?");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 transition-colors"
    >
      {loading ? "Opening..." : "Draft Follow-up"}
    </button>
  );
}

function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (!confirm("Mark this invoice as paid?")) return;
    setLoading(true);
    try {
      await fetch(`/api/invoices/${invoiceId}/mark-paid`, { method: "POST" });
      window.location.reload();
    } catch {
      alert("Failed to update invoice.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-3 py-1 text-xs font-medium text-green-700 border border-green-300 hover:bg-green-50 rounded disabled:opacity-50 transition-colors"
    >
      {loading ? "..." : "Mark Paid"}
    </button>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const { light, daysOverdue } = useTrafficLight(invoice.dueDate, invoice.status);
  const isRed = light === "red";

  return (
    <tr className={isRed ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}>
      <td className="px-4 py-3"><TrafficDot light={light} /></td>
      <td className="px-4 py-3 font-medium text-gray-900">
        {invoice.client.name}
        {invoice.client.vaultLink && (
          <span className="ml-2 text-xs text-blue-500 cursor-pointer hover:underline">
            [[{invoice.client.vaultLink}]]
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-gray-700">
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: invoice.currency,
        }).format(Number(invoice.amount))}
      </td>
      <td className="px-4 py-3 text-gray-500">
        {invoice.dueDate
          ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
              year: "numeric", month: "short", day: "numeric",
            })
          : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        {invoice.status !== "paid" && daysOverdue > 0 ? (
          <span className={isRed ? "text-red-600 font-medium" : "text-amber-600"}>
            {daysOverdue}d
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          {isRed && <DraftButton invoiceId={invoice.id} />}
          <MarkPaidButton invoiceId={invoice.id} />
        </div>
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => { setInvoices(data); setLoading(false); })
      .catch(() => { setError("Failed to load invoices. Is the dev server running?"); setLoading(false); });
  }, []);

  if (loading) return (
    <main className="p-8"><p className="text-gray-500">Loading invoices...</p></main>
  );

  if (error) return (
    <main className="p-8"><p className="text-red-600">{error}</p></main>
  );

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments Tracker</h1>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><TrafficDot light="red" /> Red: 8+ days overdue</span>
          <span className="flex items-center gap-1"><TrafficDot light="amber" /> Amber: due soon / 1–7 days overdue</span>
          <span className="flex items-center gap-1"><TrafficDot light="green" /> Green: paid or &gt;7 days</span>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="text-gray-500">No invoices yet. Seed the database to see data.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Client</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Days Overdue</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
