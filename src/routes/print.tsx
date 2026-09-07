import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getClientReport,
  getCombinedReport,
  getFounderSummary,
  getMonthSummary,
  getSessionWorkspace,
} from "@/lib/api";
import { monthTitle } from "@/lib/catalog";
import { useAsync } from "@/lib/use-async";
import {
  ClientReportDoc,
  CombinedReportDoc,
  FounderSummaryDoc,
  MonthSummaryDoc,
} from "@/components/report-document";
import { Button } from "@/components/ui/button";

type Search = {
  kind: string;
  clientId?: string;
  year: number;
  month: number;
  ids?: string;
};

export const Route = createFileRoute("/print")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    kind: String(raw.kind ?? "month"),
    clientId: raw.clientId ? String(raw.clientId) : undefined,
    year: Number(raw.year) || new Date().getFullYear(),
    month: Number(raw.month) || new Date().getMonth() + 1,
    ids: raw.ids ? String(raw.ids) : undefined,
  }),
  component: PrintPage,
});

function PrintPage() {
  const { user, isPending } = useCurrentUserState();
  const search = Route.useSearch();
  if (isPending) return <div className="min-h-svh bg-background" />;
  if (!user) return <RedirectToSignIn />;
  return <PrintBody search={search} />;
}

function PrintBody({ search }: { search: Search }) {
  const session = useAsync(() => getSessionWorkspace(), []);
  const settings = session.data?.settings;
  const clientIds = useMemo(
    () => (search.ids ? search.ids.split(",").filter(Boolean) : []),
    [search.ids],
  );

  const client = useAsync(
    () =>
      search.kind === "client" && search.clientId
        ? getClientReport({ data: { clientId: search.clientId, year: search.year, month: search.month } })
        : Promise.resolve(null),
    [search.kind, search.clientId, search.year, search.month],
  );
  const combined = useAsync(
    () =>
      search.kind === "combined"
        ? getCombinedReport({ data: { clientIds, year: search.year, month: search.month } })
        : Promise.resolve(null),
    [search.kind, clientIds.join(","), search.year, search.month],
  );
  const month = useAsync(
    () => (search.kind === "month" ? getMonthSummary({ data: { year: search.year, month: search.month } }) : Promise.resolve(null)),
    [search.kind, search.year, search.month],
  );
  const founder = useAsync(
    () => (search.kind === "founder" ? getFounderSummary({ data: { year: search.year, month: search.month } }) : Promise.resolve(null)),
    [search.kind, search.year, search.month],
  );

  const loading = client.loading || combined.loading || month.loading || founder.loading || session.loading;
  const err = client.error || combined.error || month.error || founder.error;

  return (
    <div className="min-h-svh bg-background pb-16">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {monthTitle(search.year, search.month)} · {search.kind} report
        </p>
        <Button onClick={() => window.print()}>Print / Save PDF</Button>
      </div>
      <div className="px-3 py-6 sm:px-6">
        {err ? <p className="mx-auto max-w-3xl text-sm text-destructive">{err}</p> : null}
        {loading ? <p className="mx-auto max-w-3xl text-sm text-muted-foreground">Preparing report…</p> : null}
        {search.kind === "client" && client.data ? <ClientReportDoc report={client.data} /> : null}
        {search.kind === "combined" && combined.data && settings ? (
          <CombinedReportDoc
            reports={combined.data.reports}
            settings={combined.data.settings}
            year={search.year}
            month={search.month}
          />
        ) : null}
        {search.kind === "month" && month.data && settings ? (
          <MonthSummaryDoc summary={month.data} settings={settings} />
        ) : null}
        {search.kind === "founder" && founder.data && settings ? (
          <FounderSummaryDoc summary={founder.data} settings={settings} />
        ) : null}
      </div>
    </div>
  );
}
