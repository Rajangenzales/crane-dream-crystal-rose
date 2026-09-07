import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  addSection,
  assignClientService,
  deleteActivity,
  deletePayment,
  deleteSection,
  duplicatePeriod,
  getSessionWorkspace,
  getWorkspace,
  saveActivity,
  savePayment,
  unassignClientService,
  updateClient,
} from "@/lib/api";
import { currentPeriod, monthTitle, PAYMENT_STATUSES } from "@/lib/catalog";
import { formatCompactDate, formatMoney } from "@/lib/format";
import type { Activity } from "@/lib/types";
import { useAsync } from "@/lib/use-async";
import { ActivityDialog, activityToDraft, type ActivityDraft } from "@/components/activity-dialog";
import { EmptyState } from "@/components/empty-state";
import { MonthPicker } from "@/components/month-picker";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/clients/$clientId")({ component: ClientWorkspace });

function ClientWorkspace() {
  const { clientId } = Route.useParams();
  const initial = currentPeriod();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const session = useAsync(() => getSessionWorkspace(), []);
  const { data, loading, error, reload } = useAsync(
    () => getWorkspace({ data: { clientId, year, month } }),
    [clientId, year, month],
  );
  const isAdmin = session.data?.profile.role === "admin";
  const currency = session.data?.settings.currency ?? "INR";

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (error || !data) return <p className="text-sm text-destructive">{error ?? "Client not found."}</p>;

  const { client, period, sections, payments, services, assignedServiceIds } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Clients
          </Link>
          <h1 className="mt-2 font-display text-4xl">{client.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[client.companyName, client.contactPerson, client.email, client.phone].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          {isAdmin ? (
            <DuplicateButton
              clientId={client.id}
              year={year}
              month={month}
              onDone={(y, m) => {
                setYear(y);
                setMonth(m);
                reload();
              }}
            />
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="work">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="work">Monthly work</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {sections.map((s) => {
              const done = s.activities.filter((a) => a.status === "completed" || a.status === "delivered").length;
              return (
                <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.activities.length} activities · {done} done
                  </p>
                </div>
              );
            })}
          </div>
          {payments[0] ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm">
              Payment · <StatusBadge value={payments[0].status} />{" "}
              {payments[0].amount != null ? formatMoney(payments[0].amount, currency) : ""}
            </div>
          ) : null}
          {isAdmin ? <ClientEditForm client={client} onSaved={reload} /> : null}
        </TabsContent>

        <TabsContent value="work" className="mt-5 space-y-4">
          {sections.length === 0 ? (
            <EmptyState
              title={`No sections in ${monthTitle(year, month)}`}
              body="Assign services, or add a custom section for this month."
            />
          ) : null}
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              isAdmin={isAdmin}
              onChanged={reload}
            />
          ))}
          {isAdmin ? <AddSection periodId={period.id} onAdded={reload} /> : null}
        </TabsContent>

        <TabsContent value="services" className="mt-5">
          <ServicesPanel
            isAdmin={isAdmin}
            services={services}
            assigned={assignedServiceIds}
            clientId={client.id}
            onChanged={reload}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-5">
          <PaymentsPanel
            isAdmin={isAdmin}
            payments={payments}
            clientId={client.id}
            periodId={period.id}
            year={year}
            month={month}
            currency={currency}
            onChanged={reload}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Generate from stored work — nothing to re-enter.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <a href={`/print?kind=client&clientId=${client.id}&year=${year}&month=${month}`} target="_blank" rel="noreferrer">
                  Open client report
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/reports">Combined & summaries</Link>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionCard({
  section,
  isAdmin,
  onChanged,
}: {
  section: { id: string; title: string; activities: Activity[] };
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const qty = useMemo(() => {
    const byUnit = new Map<string, number>();
    for (const a of section.activities) {
      if (a.quantity && a.unit) byUnit.set(a.unit, (byUnit.get(a.unit) ?? 0) + a.quantity);
    }
    return [...byUnit.entries()].map(([u, n]) => `${n} ${u.toLowerCase()}`).join(" · ");
  }, [section.activities]);

  async function submit(draft: ActivityDraft) {
    setBusy(true);
    try {
      await saveActivity({
        data: {
          id: editing?.id,
          sectionId: section.id,
          activityDate: draft.activityDate || null,
          title: draft.title,
          description: draft.description,
          quantity: draft.quantity ? Number(draft.quantity) : null,
          unit: draft.unit,
          status: draft.status,
          notes: draft.notes,
        },
      });
      toast.success(editing ? "Activity updated" : "Activity added");
      setOpen(false);
      setEditing(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">{section.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {section.activities.length} activities{qty ? ` · ${qty}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin ? (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" /> Add activity
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Delete section"
                onClick={async () => {
                  if (!confirm(`Remove ${section.title} from this month? Activities under it will be deleted.`)) return;
                  await deleteSection({ data: { id: section.id } });
                  toast.success("Section removed");
                  onChanged();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {section.activities.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No activities yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {section.activities.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">{formatCompactDate(a.activityDate)}</span>
                  <span className="font-medium">{a.title}</span>
                  {a.quantity != null && a.unit ? (
                    <span className="text-xs text-muted-foreground">
                      {a.quantity} {a.unit.toLowerCase()}
                    </span>
                  ) : null}
                  <StatusBadge value={a.status} />
                </div>
                {a.description ? <p className="mt-1 text-sm text-muted-foreground">{a.description}</p> : null}
              </div>
              {isAdmin ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(a);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete activity"
                    onClick={async () => {
                      await deleteActivity({ data: { id: a.id } });
                      toast.success("Deleted");
                      onChanged();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <ActivityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit activity" : `Add activity · ${section.title}`}
        initial={editing ? activityToDraft(editing) : null}
        onSubmit={submit}
        busy={busy}
      />
    </section>
  );
}

function AddSection({ periodId, onAdded }: { periodId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        await addSection({ data: { periodId, title } });
        setTitle("");
        toast.success("Section added");
        onAdded();
      }}
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Custom section name" className="sm:max-w-xs" />
      <Button type="submit" variant="outline">
        Add section
      </Button>
    </form>
  );
}

function ServicesPanel({
  isAdmin,
  services,
  assigned,
  clientId,
  onChanged,
}: {
  isAdmin: boolean;
  services: Array<{ id: string; name: string; isActive: boolean }>;
  assigned: string[];
  clientId: string;
  onChanged: () => void;
}) {
  const [custom, setCustom] = useState("");
  const [promote, setPromote] = useState(false);
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        Assigned services seed each new month. Removing one here does not delete historical monthly sections.
      </p>
      <ul className="space-y-2">
        {services.filter((s) => s.isActive || assigned.includes(s.id)).map((s) => {
          const on = assigned.includes(s.id);
          return (
            <li key={s.id} className="flex items-center gap-3">
              <Checkbox
                checked={on}
                disabled={!isAdmin}
                onCheckedChange={async (checked) => {
                  if (checked) await assignClientService({ data: { clientId, serviceId: s.id } });
                  else await unassignClientService({ data: { clientId, serviceId: s.id } });
                  onChanged();
                }}
              />
              <span>{s.name}</span>
            </li>
          );
        })}
      </ul>
      {isAdmin ? (
        <form
          className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!custom.trim()) return;
            await assignClientService({ data: { clientId, customName: custom, promote } });
            setCustom("");
            toast.success("Custom service assigned");
            onChanged();
          }}
        >
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Client-only custom service" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={promote} onCheckedChange={(v) => setPromote(Boolean(v))} />
            Add to library
          </label>
          <Button type="submit" variant="outline">
            Add
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function PaymentsPanel({
  isAdmin,
  payments,
  clientId,
  periodId,
  year,
  month,
  currency,
  onChanged,
}: {
  isAdmin: boolean;
  payments: Array<{
    id: string;
    status: string;
    amount: number | null;
    paymentDate: string | null;
    notes: string;
  }>;
  clientId: string;
  periodId: string;
  year: number;
  month: number;
  currency: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      {payments.length === 0 ? (
        <EmptyState title="No payment recorded" body="Payments live independently of report generation." />
      ) : (
        payments.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <StatusBadge value={p.status} />
              <p className="mt-2 font-display text-2xl tabular-nums">{formatMoney(p.amount, currency)}</p>
              <p className="text-sm text-muted-foreground">{p.notes}</p>
            </div>
            {isAdmin ? (
              <Button
                variant="ghost"
                onClick={async () => {
                  await deletePayment({ data: { id: p.id } });
                  onChanged();
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))
      )}
      {isAdmin ? (
        <>
          <Button onClick={() => setOpen(true)}>Record payment</Button>
          <PaymentDialog
            open={open}
            onOpenChange={setOpen}
            onSubmit={async (form) => {
              await savePayment({
                data: {
                  clientId,
                  periodId,
                  year,
                  month,
                  status: form.status,
                  amount: form.amount ? Number(form.amount) : null,
                  paymentDate: form.paymentDate || null,
                  notes: form.notes,
                },
              });
              setOpen(false);
              toast.success("Payment saved");
              onChanged();
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (f: { status: string; amount: string; paymentDate: string; notes: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ status: "pending", amount: "", paymentDate: "", notes: "" });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Payment</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onSubmit(form);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label>Amount</Label>
          <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Label>Date</Label>
          <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClientEditForm({
  client,
  onSaved,
}: {
  client: {
    id: string;
    name: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    notes: string;
    isActive: boolean;
  };
  onSaved: () => void;
}) {
  const [form, setForm] = useState(client);
  return (
    <form
      className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await updateClient({
          data: {
            id: client.id,
            name: form.name,
            companyName: form.companyName,
            contactPerson: form.contactPerson,
            email: form.email,
            phone: form.phone,
            notes: form.notes,
            isActive: form.isActive,
          },
        });
        toast.success("Client updated");
        onSaved();
      }}
    >
      <h3 className="font-display text-xl sm:col-span-2">Client details</h3>
      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Company" />
      <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact" />
      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
      <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="sm:col-span-2" />
      <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2" />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: Boolean(v) })} />
        Active
      </label>
      <Button type="submit" className="sm:justify-self-end">
        Save details
      </Button>
    </form>
  );
}

function DuplicateButton({
  clientId,
  year,
  month,
  onDone,
}: {
  clientId: string;
  year: number;
  month: number;
  onDone: (year: number, month: number) => void;
}) {
  const prev = new Date(year, month - 2, 1);
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await duplicatePeriod({
          data: {
            clientId,
            fromYear: prev.getFullYear(),
            fromMonth: prev.getMonth() + 1,
            toYear: year,
            toMonth: month,
          },
        });
        toast.success(`Copied structure from ${monthTitle(prev.getFullYear(), prev.getMonth() + 1)}`);
        onDone(year, month);
      }}
    >
      Duplicate previous month
    </Button>
  );
}
