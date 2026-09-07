import { Link, createFileRoute } from "@tanstack/react-router";
import { getDashboard, getSessionWorkspace } from "@/lib/api";
import { currentPeriod, monthTitle } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { MonthPicker } from "@/components/month-picker";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export const Route = createFileRoute("/_app/")({ component: DashboardPage });

function DashboardPage() {
  const initial = currentPeriod();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const session = useAsync(() => getSessionWorkspace(), []);
  const { data, loading, error } = useAsync(() => getDashboard({ data: { year, month } }), [year, month]);
  const currency = session.data?.settings.currency ?? "INR";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Overview</p>
          <h1 className="mt-1 font-display text-4xl">{monthTitle(year, month)}</h1>
        </div>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading || !data ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Active clients" value={String(data.activeClients)} />
            <Stat label="With work" value={String(data.clientsThisMonth)} />
            <Stat label="Activities" value={String(data.totalActivities)} hint={`${data.completedActivities} completed`} />
            <Stat label="Received" value={formatMoney(data.paymentsReceived, currency)} hint={`Pending ${formatMoney(data.paymentsPending, currency)}`} />
          </div>
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-display text-2xl">This month</h2>
              <Link to="/clients" className="text-sm text-muted-foreground hover:text-foreground">
                All clients
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {data.clientRows.map((row) => (
                <li key={row.client.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link to="/clients/$clientId" params={{ clientId: row.client.id }} className="font-medium hover:underline">
                        {row.client.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{row.client.companyName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.workSummary}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {row.completedCount}/{row.activityCount} done
                      </p>
                      {row.paymentStatus !== "—" ? <StatusBadge value={row.paymentStatus} /> : <span className="text-muted-foreground">—</span>}
                      {row.paymentAmount != null ? (
                        <p className="text-xs text-muted-foreground">{formatMoney(row.paymentAmount, currency)}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums leading-none">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
