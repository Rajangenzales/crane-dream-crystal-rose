import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createBackup, getSessionWorkspace, listAudit, listBackups, restoreBackup, updateSettings } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const session = useAsync(() => getSessionWorkspace(), []);
  const backups = useAsync(() => listBackups(), []);
  const audit = useAsync(() => listAudit(), []);
  const [form, setForm] = useState({
    agencyName: "",
    agencyTagline: "",
    currency: "INR",
    viewersSeePayments: true,
  });

  useEffect(() => {
    if (session.data) {
      setForm({
        agencyName: session.data.settings.agencyName,
        agencyTagline: session.data.settings.agencyTagline,
        currency: session.data.settings.currency,
        viewersSeePayments: session.data.settings.viewersSeePayments,
      });
    }
  }, [session.data]);

  if (session.data && session.data.profile.role !== "admin") {
    return <p className="text-sm text-muted-foreground">Only administrators can change settings.</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Studio</p>
        <h1 className="mt-1 font-display text-4xl">Settings</h1>
      </div>

      {session.loading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : (
        <form
          className="grid max-w-lg gap-3 rounded-2xl border border-border bg-card p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            await updateSettings({ data: form });
            toast.success("Settings saved");
            session.reload();
          }}
        >
          <Label>Agency name</Label>
          <Input value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} />
          <Label>Tagline</Label>
          <Input value={form.agencyTagline} onChange={(e) => setForm({ ...form, agencyTagline: e.target.value })} />
          <Label>Currency</Label>
          <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          <label className="flex items-center justify-between gap-3 text-sm">
            Viewers can see payment amounts
            <Switch
              checked={form.viewersSeePayments}
              onCheckedChange={(viewersSeePayments) => setForm({ ...form, viewersSeePayments })}
            />
          </label>
          <Button type="submit" className="mt-2 w-fit">
            Save
          </Button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Backups</h2>
        <p className="text-sm text-muted-foreground">Snapshots of work data. Restore creates a safety copy first.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              const result = await createBackup({ data: { note: "Manual backup" } });
              const blob = new Blob([result.payloadJson], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `monthly-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Backup created");
              backups.reload();
            }}
          >
            Backup now
          </Button>
          <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-input px-3 text-sm">
            Restore from file
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                await restoreBackup({ data: { payload: JSON.parse(text) } });
                toast.success("Backup restored");
                backups.reload();
                session.reload();
              }}
            />
          </label>
        </div>
        {backups.data?.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {backups.data.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>
                  {b.note} · {formatDate(b.createdAt.slice(0, 10))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!confirm("Restore this backup? A safety copy of the current data will be kept.")) return;
                    await restoreBackup({ data: { id: b.id } });
                    toast.success("Restored");
                    session.reload();
                  }}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Audit</h2>
        {audit.loading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card text-sm">
            {(audit.data ?? []).map((row) => (
              <li key={row.id} className="px-5 py-2.5">
                <span className="font-medium">{row.action}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {row.entityType} {row.detail} · {formatDate(row.createdAt.slice(0, 10))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
