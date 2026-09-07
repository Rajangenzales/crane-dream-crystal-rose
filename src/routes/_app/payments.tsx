import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getSessionWorkspace, listPayments } from "@/lib/api";
import { currentPeriod, monthTitle } from "@/lib/catalog";
import { formatDate, formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { MonthPicker } from "@/components/month-picker";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const initial = currentPeriod();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const session = useAsync(() => getSessionWorkspace(), []);
  const { data, loading, error } = useAsync(() => listPayments({ data: { year, month } }), [year, month]);
  const currency = session.data?.settings.currency ?? "INR";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Ledger</p>
          <h1 className="mt-1 font-display text-4xl">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">{monthTitle(year, month)}</p>
        </div>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading || !data ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {data.length === 0 ? (
              <li className="px-5 py-8 text-sm text-muted-foreground">No payments recorded this month.</li>
            ) : (
              data.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <Link className="font-medium hover:underline" to="/clients/$clientId" params={{ clientId: p.clientId }}>
                      {p.clientName ?? "Client"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDate(p.paymentDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={p.status} />
                    <span className="tabular-nums text-sm">{formatMoney(p.amount, currency)}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
