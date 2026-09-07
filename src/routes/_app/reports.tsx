import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { currentPeriod, monthTitle } from "@/lib/catalog";
import { listClients } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

function ReportsPage() {
  const initial = currentPeriod();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const { data, loading } = useAsync(() => listClients({ data: {} }), []);
  const [selected, setSelected] = useState<string[]>([]);
  const ids = useMemo(() => selected.join(","), [selected]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Output</p>
          <h1 className="mt-1 font-display text-4xl">Reports</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Generated from stored work. Open a document, then use Print to save a PDF.
          </p>
        </div>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReportCard
          title="Monthly summary"
          body={`Studio-wide view of ${monthTitle(year, month)}.`}
          href={`/print?kind=month&year=${year}&month=${month}`}
        />
        <ReportCard
          title="Founder summary"
          body="Active clients, quantities, outstanding payments, and gaps."
          href={`/print?kind=founder&year=${year}&month=${month}`}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">Combined client report</h2>
        <p className="mt-1 text-sm text-muted-foreground">Select clients to bind into one printable document.</p>
        {loading || !data ? (
          <Skeleton className="mt-4 h-40" />
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {data.map((c) => {
              const on = selected.includes(c.id);
              return (
                <li key={c.id}>
                  <label className="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-secondary/60">
                    <Checkbox
                      checked={on}
                      onCheckedChange={(checked) => {
                        setSelected((prev) => (checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)));
                      }}
                    />
                    {c.name}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4">
          <Button asChild disabled={!selected.length}>
            <a href={`/print?kind=combined&year=${year}&month=${month}&ids=${ids}`} target="_blank" rel="noreferrer">
              Open combined report
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}

function ReportCard({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Button className="mt-4" asChild>
        <a href={href} target="_blank" rel="noreferrer">
          Open
        </a>
      </Button>
    </div>
  );
}
