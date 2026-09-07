import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createEmailUser, getSessionWorkspace, listUsers, updateUserAccess } from "@/lib/api";
import type { Role } from "@/lib/types";
import { useAsync } from "@/lib/use-async";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/users")({ component: UsersPage });

function UsersPage() {
  const session = useAsync(() => getSessionWorkspace(), []);
  const { data, loading, error, reload } = useAsync(() => listUsers(), []);
  const [open, setOpen] = useState(false);
  if (session.data && session.data.profile.role !== "admin") {
    return <p className="text-sm text-muted-foreground">Only administrators can manage users.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Access</p>
          <h1 className="mt-1 font-display text-4xl">Users</h1>
        </div>
        <Button onClick={() => setOpen(true)}>New user</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading || !data ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {data.map((u) => (
            <li key={u.userId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <Select
                  value={u.role}
                  onValueChange={async (role) => {
                    await updateUserAccess({ data: { userId: u.userId, role: role as Role } });
                    reload();
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  {u.isActive ? <StatusBadge value="completed" /> : <StatusBadge value="pending" />}
                  <Switch
                    checked={u.isActive}
                    onCheckedChange={async (isActive) => {
                      try {
                        await updateUserAccess({ data: { userId: u.userId, isActive } });
                        reload();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not update");
                      }
                    }}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
      <NewUserDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => {
          setOpen(false);
          reload();
        }}
      />
    </div>
  );
}

function NewUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" as Role });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create user</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await createEmailUser({ data: form });
              toast.success("User created");
              setForm({ name: "", email: "", password: "", role: "viewer" });
              onCreated();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not create user");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Label>Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Label>Email</Label>
          <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Label>Password</Label>
          <Input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Label>Role</Label>
          <Select value={form.role} onValueChange={(role) => setForm({ ...form, role: role as Role })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
