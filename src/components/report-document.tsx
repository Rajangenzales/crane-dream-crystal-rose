import { monthTitle, statusLabel } from "@/lib/catalog";
import { formatDate, formatMoney } from "@/lib/format";
import type { ClientReport, FounderSummary, MonthSummary, Settings } from "@/lib/types";

function Letterhead({ settings, kicker }: { settings: Settings; kicker: string }) {
  return (
    <header className="flex items-end justify-between border-b border-border pb-5">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">{settings.agencyName}</p>
        <h1 className="mt-1 font-display text-3xl text-foreground">{kicker}</h1>
        {settings.agencyTagline ? (
          <p className="mt-1 text-sm text-muted-foreground">{settings.agencyTagline}</p>
        ) : null}
      </div>
      <div className="text-right text-sm text-muted-foreground">Monthly report</div>
    </header>
  );
}

export function ClientReportDoc({ report }: { report: ClientReport }) {
  const { client, period, sections, payments, settings } = report;
  const worked = sections.filter((s) => s.activities.length > 0);
  return (
    <article className="mx-auto max-w-3xl bg-card px-8 py-10 text-card-foreground print:max-w-none print:px-0">
      <Letterhead settings={settings} kicker={monthTitle(period.year, period.month)} />
      <section className="mt-8">
        <h2 className="font-display text-2xl">{client.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {[client.companyName, client.contactPerson, client.email].filter(Boolean).join(" · ")}
        </p>
      </section>
      <section className="mt-8">
        <h3 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Services worked on</h3>
        <div className="mt-4 space-y-6">
          {worked.length === 0 ? <p className="text-sm text-muted-foreground">No activities recorded this month.</p> : null}
          {worked.map((section) => (
            <div key={section.id}>
              <h4 className="font-medium">{section.title}</h4>
              <ul className="mt-2 space-y-1.5">
                {section.activities.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="text-muted-foreground tabular-nums">{formatDate(a.activityDate)}</span>
                    <span>{a.title}</span>
                    {a.quantity != null && a.unit ? (
                      <span className="text-muted-foreground">
                        · {a.quantity} {a.unit.toLowerCase()}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground">· {statusLabel(a.status)}</span>
                    {a.description ? <p className="w-full pl-0 text-muted-foreground">{a.description}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      {payments.length > 0 ? (
        <section className="mt-8 border-t border-border pt-6">
          <h3 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Payment</h3>
          <ul className="mt-3 space-y-1 text-sm">
            {payments.map((p) => (
              <li key={p.id}>
                Status: {statusLabel(p.status)}
                {p.amount != null ? ` · ${formatMoney(p.amount, settings.currency)}` : ""}
                {p.paymentDate ? ` · ${formatDate(p.paymentDate)}` : ""}
                {p.notes ? ` · ${p.notes}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export function CombinedReportDoc({
  reports,
  settings,
  year,
  month,
}: {
  reports: ClientReport[];
  settings: Settings;
  year: number;
  month: number;
}) {
  return (
    <div className="space-y-10">
      {reports.map((report, i) => (
        <div key={report.client.id} className={i < reports.length - 1 ? "print-page" : ""}>
          <ClientReportDoc report={{ ...report, settings }} />
        </div>
      ))}
      {reports.length === 0 ? (
        <article className="mx-auto max-w-3xl bg-card px-8 py-10">
          <Letterhead settings={settings} kicker={monthTitle(year, month)} />
          <p className="mt-8 text-sm text-muted-foreground">No clients selected.</p>
        </article>
      ) : null}
    </div>
  );
}

export function MonthSummaryDoc({ summary, settings }: { summary: MonthSummary; settings: Settings }) {
  return (
    <article className="mx-auto max-w-3xl bg-card px-8 py-10">
      <Letterhead settings={settings} kicker={`${monthTitle(summary.year, summary.month)} summary`} />
      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Clients served" value={String(summary.clientsServed)} />
        <Stat label="Activities" value={String(summary.totalActivities)} />
        <Stat label="Received" value={formatMoney(summary.paymentsReceived, settings.currency)} />
        <Stat label="Pending" value={formatMoney(summary.paymentsPending, settings.currency)} />
      </dl>
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Client</th>
            <th className="py-2 pr-3 font-medium">Work done</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((row) => (
            <tr key={row.client.id} className="border-b border-border/70">
              <td className="py-2.5 pr-3 align-top font-medium">{row.client.name}</td>
              <td className="py-2.5 pr-3 align-top text-muted-foreground">{row.workDone}</td>
              <td className="py-2.5 text-right align-top tabular-nums">{row.totalWork}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export function FounderSummaryDoc({ summary, settings }: { summary: FounderSummary; settings: Settings }) {
  return (
    <article className="mx-auto max-w-3xl bg-card px-8 py-10">
      <Letterhead settings={settings} kicker={`${monthTitle(summary.year, summary.month)} · Founder`} />
      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Active clients" value={String(summary.activeClients)} />
        <Stat label="With work" value={String(summary.clientsServed)} />
        <Stat label="Activities" value={String(summary.totalActivities)} />
        <Stat label="Received" value={formatMoney(summary.paymentsReceived, settings.currency)} />
      </dl>
      {summary.units.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Quantities</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {summary.units.map((u) => (
              <li key={u.unit} className="rounded-full bg-secondary px-3 py-1 text-sm">
                {u.quantity} {u.unit.toLowerCase()}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {summary.services.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Service mix</h3>
          <ul className="mt-3 space-y-1 text-sm">
            {summary.services.map((s) => (
              <li key={s.name}>
                {s.name} · {s.sections} client{s.sections === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {summary.clientsWithNoWork.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">No recorded work</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {summary.clientsWithNoWork.map((c) => c.name).join(", ")}
          </p>
        </section>
      ) : null}
      {summary.clientsWithOutstanding.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Outstanding payments</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {summary.clientsWithOutstanding.map((c) => (
              <li key={c.id}>
                {c.name}
                {c.amount != null ? ` · ${formatMoney(c.amount, settings.currency)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/70 px-3 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-2xl tabular-nums">{value}</dd>
    </div>
  );
}
