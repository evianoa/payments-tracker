"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

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
  pdfUrl: string | null;
  notes: string | null;
  createdAt: string;
  client: Client;
}

interface EmailDraft {
  subject: string;
  body: string;
  gmailUrl: string;
}

type SortKey = "status" | "client" | "amount" | "dueDate" | "daysOverdue";
type SortDir = "asc" | "desc";

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

function SortHeader({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  direction: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <th
      className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          <span className="text-xs">{direction === "asc" ? "▲" : "▼"}</span>
        )}
      </span>
    </th>
  );
}

function InvoiceDetailModal({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const { light, daysOverdue } = useTrafficLight(invoice.dueDate, invoice.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{invoice.client.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <TrafficDot light={light} />
            <span className="font-medium capitalize">{invoice.status}</span>
            {daysOverdue > 0 && (
              <span className={light === "red" ? "text-red-600" : "text-amber-600"}>
                {daysOverdue}d overdue
              </span>
            )}
          </div>

          <div className="border-t pt-3 space-y-2">
            <Row label="Amount" value={new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: invoice.currency,
            }).format(Number(invoice.amount))} />
            <Row label="Due Date" value={invoice.dueDate
              ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric",
                })
              : "—"} />
            <Row label="Client Email" value={invoice.client.email || "—"} />
            {invoice.client.vaultLink && (
              <Row label="Vault Link" value={`[[${invoice.client.vaultLink}]]`} />
            )}
            {invoice.pdfUrl && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">PDF</span>
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  View Invoice
                </a>
              </div>
            )}
            {invoice.notes && <Row label="Notes" value={invoice.notes} />}
          </div>

          <div className="border-t pt-3 flex gap-2">
            {light === "red" && <DraftButton invoiceId={invoice.id} />}
            <MarkPaidButton invoiceId={invoice.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function InvoiceRow({
  invoice,
  onSelect,
}: {
  invoice: Invoice;
  onSelect: (inv: Invoice) => void;
}) {
  const { light, daysOverdue } = useTrafficLight(invoice.dueDate, invoice.status);
  const isRed = light === "red";

  return (
    <tr
      className={`${isRed ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"} cursor-pointer`}
      onClick={() => onSelect(invoice)}
    >
      <td className="px-4 py-3"><TrafficDot light={light} /></td>
      <td className="px-4 py-3 font-medium text-gray-900">
        {invoice.client.name}
        {invoice.client.vaultLink && (
          <span className="ml-2 text-xs text-blue-500">[[{invoice.client.vaultLink}]]</span>
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
        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          {invoice.pdfUrl && (
            <a
              href={invoice.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              PDF
            </a>
          )}
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
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => { setInvoices(data); setLoading(false); })
      .catch(() => { setError("Failed to load invoices. Is the dev server running?"); setLoading(false); });
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const trafficLightValue = useCallback((inv: Invoice): number => {
    if (inv.status === "paid") return 0;
    if (!inv.dueDate) return 1;
    const diff = Math.floor(
      (new Date().getTime() - new Date(inv.dueDate).getTime()) / 86_400_000
    );
    if (diff >= 8) return 3;
    if (diff >= 1 || (diff <= 0 && diff >= -7)) return 2;
    return 1;
  }, []);

  const sorted = useMemo(() => {
    const list = [...invoices];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "status":
          cmp = trafficLightValue(a) - trafficLightValue(b);
          break;
        case "client":
          cmp = a.client.name.localeCompare(b.client.name);
          break;
        case "amount":
          cmp = Number(a.amount) - Number(b.amount);
          break;
        case "dueDate": {
          if (!a.dueDate && !b.dueDate) cmp = 0;
          else if (!a.dueDate) cmp = 1;
          else if (!b.dueDate) cmp = -1;
          else cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        }
        case "daysOverdue": {
          const aDiff = a.dueDate
            ? Math.floor((new Date().getTime() - new Date(a.dueDate).getTime()) / 86_400_000)
            : 0;
          const bDiff = b.dueDate
            ? Math.floor((new Date().getTime() - new Date(b.dueDate).getTime()) / 86_400_000)
            : 0;
          cmp = aDiff - bDiff;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [invoices, sortKey, sortDir, trafficLightValue]);

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
                <SortHeader label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Client" sortKey="client" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Amount" sortKey="amount" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Due Date" sortKey="dueDate" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Days Overdue" sortKey="daysOverdue" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-center font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sorted.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} onSelect={setSelectedInvoice} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </main>
  );
}
