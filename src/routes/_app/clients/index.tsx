import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createClient, getSessionWorkspace, listClients } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_app/clients/")({ component: ClientsPage });

function ClientsPage() {
  const session = useAsync(() => getSessionWorkspace(), []);
  const { data, loading, error, reload } = useAsync(() => listClients({ data: { includeInactive: true } }), []);
  const [open, setOpen] = useState(false);
  const isAdmin = session.data?.profile.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Directory</p>
          <h1 className="mt-1 font-display text-4xl">Clients</h1>
        </div>
        {isAdmin ? (
          <Button className="h-11" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New client
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Add a client, assign services, then record the month's work in their workspace."
          action={isAdmin ? <Button onClick={() => setOpen(true)}>Add client</Button> : null}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((client) => (
            <Link
              key={client.id}
              to="/clients/$clientId"
              params={{ clientId: client.id }}
              className="flex gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/40"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary font-display text-lg">
                {initials(client.name)}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{client.name}</span>
                  {!client.isActive ? <span className="text-xs text-muted-foreground">Archived</span> : null}
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">{client.companyName || client.contactPerson}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {client.serviceNames.length ? client.serviceNames.join(" · ") : "No services assigned"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
      <ClientForm
        open={open}
        onOpenChange={setOpen}
        onCreated={async () => {
          setOpen(false);
          reload();
        }}
      />
    </div>
  );
}

function ClientForm({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", companyName: "", contactPerson: "", email: "", phone: "", notes: "" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">New client</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await createClient({ data: form });
              toast.success("Client created");
              setForm({ name: "", companyName: "", contactPerson: "", email: "", phone: "", notes: "" });
              onCreated();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not create client");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Client name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <Field label="Company" value={form.companyName} onChange={(companyName) => setForm({ ...form, companyName })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact" value={form.contactPerson} onChange={(contactPerson) => setForm({ ...form, contactPerson })} />
            <Field label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          </div>
          <Field label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input required={required} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
